import { FetchQ, FetchQueueConfig } from "./interfaces/index.js";

const originalFetch: FetchQ = fetch;

/**
 * The `FetchQueue` class is a utility class that allows for managing and controlling concurrent fetch requests.
 * It ensures that the number of active requests does not exceed a specified limit, and queues any additional requests until a slot becomes available.
 */
export class FetchQueue {
  /**
   * The maximum number of concurrent fetch requests allowed.
   */
  private concurrent: number;

  /**
   * Indicates whether debugging is enabled or not.
   */
  private debug: boolean;

  /**
   * An array of strings representing the URLs in the queue.
   */
  private urlInQueue: Array<string>;

  /**
   * An array of strings representing the URLs executing.
   */
  private executing: Array<string>;

  /**
   * The current number of active fetch requests.
   */
  private activeRequests: number;
  /**
   * A queue of tasks to be executed when a slot becomes available for a new fetch request.
   */
  private queue: Array<() => void>;

  /**
   * Initializes a new instance of the FetchQueue class with an optional FetchQueueConfig object.
   * If no options are provided, the default concurrent value is set to 3.
   * @param {FetchQueueConfig} options - The FetchQueueConfig object containing the concurrent value.
   */
  constructor(options?: FetchQueueConfig) {
    this.concurrent = options?.concurrent || 3;
    this.debug = options?.debug || false;
    this.activeRequests = 0;
    this.queue = [];
    this.urlInQueue = [];
    this.executing = [];

    if (typeof this.concurrent !== "number" || this.concurrent <= 0) {
      throw new Error("Concurrent should be a number greater than zero.");
    }
  }

  /**
   * Executes a fetch request with the specified URL, fetch function, and options.
   * Increments the activeRequests count and handles queuing of additional requests if the maximum concurrent limit is reached.
   * @param url - The URL for the fetch request.
   * @param fetch - The fetch function to use for the request.
   * @param options - The options for the fetch request.
   * @returns A Promise that resolves to the fetch response.
   */
  private run = async (
    url: RequestInfo | URL,
    fetch: FetchQ,
    options?: RequestInit
  ): Promise<Response> => {
    this.activeRequests++;
    try {
      if (this.debug) {
        this.executing.push(url.toString());
        console.log("executing", this.executing);
      }
      const response: Response = await fetch(url, options);
      if (this.debug) {
        const index = this.executing.indexOf(url.toString());
        this.executing.splice(index, 1);
      }
      return response;
    } finally {
      this.activeRequests--;
      this.emitRequestCompletedEvent();
    }
  };

  /**
   * Executes the next task in the queue when a fetch request is completed.
   */
  private emitRequestCompletedEvent(): void {
    if (this.debug) {
      if (this.urlInQueue.length > 0) {
        console.log("queue", this.urlInQueue);
        this.urlInQueue.shift();
      }
    }
    if (this.queue.length <= 0) return;
    const nextTask = this.queue.shift();
    nextTask!();
  }

  /**
   * Sets the global fetch function to the custom fetch function of the FetchQueue class.
   */
  public createQueue() {
    global.fetch = this.f_fetch;
  }

  /**
   * Resets the queue and sets the global fetch function back to the original fetch function.
   */
  public disposeQueue() {
    this.queue = [];
    global.fetch = originalFetch;
  }

  /**
   * Returns the custom fetch function used by the FetchQueue class to handle queuing of fetch requests.
   *
   * @returns The custom fetch function.
   */
  public getFetch() {
    return this.f_fetch;
  }

  /**
   * The internal fetch implementation that handles queuing of fetch requests.
   */
  private f_fetch = (() => {
    let fetch = global.fetch;
    return (
      url: RequestInfo | URL,
      options?: RequestInit
    ): Promise<Response> => {
      const task = () => this.run(url, fetch, options);

      if (this.activeRequests < this.concurrent) {
        return task();
      } else {
        return new Promise((resolve, reject) => {
          const queueTask = () => {
            task().then(resolve).catch(reject);
          };
          this.queue.push(queueTask);
          if (this.debug) {
            this.urlInQueue.push(url.toString().split("/").slice(-3).join("/"));
          }
        });
      }
    };
  })();
}
