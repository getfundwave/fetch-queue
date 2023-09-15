import { FetchQ, FetchQueueConfig } from "./interfaces/index.js";

/**
 * The `FetchQueue` class is a utility class that allows for managing and controlling concurrent fetch requests.
 * It ensures that the number of active requests does not exceed a specified limit, and queues any additional requests until a slot becomes available.
 */
export class FetchQueue {
  /**
   * The maximum number of concurrent fetch requests allowed.
   */
  private concurrent: number;

  private debug: boolean;

  private urlInQueue?: Array<string>;
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
   * @param options - The FetchQueueConfig object containing the concurrent value.
   */
  constructor(options?: FetchQueueConfig) {
    this.concurrent = options?.concurrent || 3;
    this.debug = options?.debug || false;
    this.activeRequests = 0;
    this.queue = [];
    if (this.debug) {
      this.urlInQueue = [];
    }
    if (typeof this.concurrent !== "number")
      throw Error("Concurrent should be a number.");
    if (this.concurrent < 0)
      throw Error("Concurrent should be greater than zero.");
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
        localStorage.setItem("executing", url.toString());
      }
      const response: Response = await fetch(url, options);
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
    if (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (this.debug && this.urlInQueue != null) {
        this.urlInQueue!.shift();
        localStorage.setItem("queue", this.urlInQueue.toString());
        console.log("queue", localStorage.getItem("queue"));
        console.log("executing", localStorage.getItem("executing"));
      }
      nextTask!();
    }
  }

  /**
   * Initializes the global fetch function to use the FetchQueue's internal fetch implementation.
   */
  initQueue() {
    global.fetch = this.f_fetch;
  }

  /**
   * The internal fetch implementation that handles queuing of fetch requests.
   */
  private f_fetch = (() => {
    const fetch = global.fetch;

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
          if (this.debug && this.urlInQueue != null) {
            this.urlInQueue!.push(
              url.toString().split("/").slice(-3).join("/")
            );
            localStorage.setItem("queue", this.urlInQueue.toString());
          }
        });
      }
    };
  })();
}
