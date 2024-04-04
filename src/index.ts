import fetch from "node-fetch";
import { RequestInfo, RequestInit, Response } from "node-fetch";
import { FetchQueueConfig } from "./interfaces/index.js";
/**
 * The `FetchQueue` class is a utility class that allows for managing and controlling concurrent fetch requests.
 * It ensures that the number of active requests does not exceed a specified limit, and queues any additional requests until a slot becomes available.
 */
export class FetchQueue {
  /**
   * The maximum number of concurrent fetch requests allowed.
   */
  #concurrent: number;

  /**
   * Indicates whether debugging is enabled or not.
   */
  #debug: boolean;

  /**
   * An array of strings representing the URLs in the queue.
   */
  #urlsQueued: Array<string>;

  /**
   * An array of strings representing the URLs executing.
   */
  #urlsExecuting: Array<string>;

  /**
   * The current number of active fetch requests.
   */
  #activeRequests: number;
  /**
   * A queue of tasks to be executed when a slot becomes available for a new fetch request.
   */
  #queue: Array<() => void>;

  /**
   * If true, Disables task executions but {@link #queue} gets populated.
   */
  #pauseQueue: boolean;

  /**
   * Initializes a new instance of the FetchQueue class with an optional FetchQueueConfig object.
   * If no options are provided, the default concurrent value is set to 3.
   * @param {FetchQueueConfig} options - The FetchQueueConfig object containing the concurrent value.
   */
  constructor(options?: FetchQueueConfig) {
    this.#concurrent = options?.concurrent || 3;
    this.#debug = options?.debug || false;
    this.#activeRequests = 0;
    this.#queue = [];
    this.#urlsQueued = [];
    this.#urlsExecuting = [];
    this.#pauseQueue = options?.pauseQueueOnInit || false;

    if (typeof this.#concurrent !== "number" || this.#concurrent <= 0) {
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
  #run = async (url: URL | RequestInfo, options?: RequestInit): Promise<Response> => {
    this.#activeRequests++;
    try {
      if (this.#debug) {
        this.#urlsExecuting.push(url.toString());
        console.log("executing", this.#urlsExecuting);
      }
      const response: Response = await fetch(url, options);
      if (this.#debug) {
        const index = this.#urlsExecuting.indexOf(url.toString());
        this.#urlsExecuting.splice(index, 1);
      }
      return response;
    } finally {
      this.#activeRequests--;
      this.#emitRequestCompletedEvent();
    }
  };

  /**
   * Executes the next task in the queue when a fetch request is completed.
   */
  #emitRequestCompletedEvent = (): void => {
    if (this.#debug) {
      if (this.#urlsQueued.length > 0) {
        console.log("queue", this.#urlsQueued);
        this.#urlsQueued.shift();
      }
    }
    if (this.#queue.length <= 0 || this.#pauseQueue) return;
    const nextTask = this.#queue.shift();
    nextTask!();
  };

  /**
   * Returns the custom fetch function used by the FetchQueue class to handle queuing of fetch requests.
   * @returns The custom fetch function.
   */
  public getFetchMethod() {
    return this.#f_fetch;
  }

  /**
   * @returns value of concurrent property
   */
  public getConcurrent() {
    return this.#concurrent;
  }

  /**
   * set value of concurrent property
   * @param {number} concurrent
   */
  public setConcurrent(concurrent: number) {
    this.#concurrent = concurrent;
  }

  /**
   * @returns value of debug property
   */
  public getDebug() {
    return this.#debug;
  }

  /**
   * set value of debug property
   * @param {boolean} debug
   */
  public setDebug(debug: boolean) {
    this.#debug = debug;
  }

  /**
   * Disables the queuing of fetch requests in the FetchQueue.
   * @returns {void}
   */
  public pauseQueue(): void {
    this.#pauseQueue = true;
    this.#activeRequests = 0;
  }

  /**
   * Enables the queuing of fetch requests in the FetchQueue.
   * @param {boolean} [emptyQueue] If true, empties the queue before starting.
   * @returns {void}
   */
  public startQueue(emptyQueue?: boolean): void {
    if (emptyQueue) this.#queue = [];
    if (this.#debug && emptyQueue) this.#urlsQueued = [];

    this.#pauseQueue = false;
    this.#emitRequestCompletedEvent();
  }

  /**
   * @returns Length of queue
   */
  public getQueueLength(): number {
    return this.#queue.length;
  }

  /**
   * @returns Number of active requests
   */
  public getActiveRequests(): number {
    return this.#activeRequests;
  }

  /**
   * The internal fetch implementation that handles queuing of fetch requests.
   */
  #f_fetch = (() => {
    return (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
      const task = () => this.#run(url, options);

      if (this.#activeRequests < this.#concurrent && !this.#pauseQueue) {
        return task();
      }
      return new Promise((resolve, reject) => {
        const queueTask = () => {
          task().then(resolve).catch(reject);
        };
        this.#queue.push(queueTask);
        if (this.#debug) {
          this.#urlsQueued.push(url.toString().split("/").slice(-3).join("/"));
        }
      });
    };
  })();
}
