import fetch from "node-fetch";
import { FetchQueueConfig } from "./interfaces/index.js";
import {RequestInfo, RequestInit, Response} from "node-fetch"
/**
 * The `FetchQueue` class is a utility class that allows for managing and controlling concurrent fetch requests.
 * It ensures that the number of active requests does not exceed a specified limit, and queues any additional requests until a slot becomes available.
 */
export class FetchQueue {
  /**
   * The maximum number of concurrent fetch requests allowed.
   */
  private _concurrent: number;

  /**
   * Indicates whether debugging is enabled or not.
   */
  private _debug: boolean;

  /**
   * An array of strings representing the URLs in the queue.
   */
  private _urlsQueued: Array<string>;

  /**
   * An array of strings representing the URLs executing.
   */
  private _urlsExecuting: Array<string>;

  /**
   * The current number of active fetch requests.
   */
  private _activeRequests: number;
  /**
   * A queue of tasks to be executed when a slot becomes available for a new fetch request.
   */
  private _queue: Array<() => void>;

  /**
   * Initializes a new instance of the FetchQueue class with an optional FetchQueueConfig object.
   * If no options are provided, the default concurrent value is set to 3.
   * @param {FetchQueueConfig} options - The FetchQueueConfig object containing the concurrent value.
   */
  constructor(options?: FetchQueueConfig) {
    this._concurrent = options?.concurrent || 3;
    this._debug = options?.debug || false;
    this._activeRequests = 0;
    this._queue = [];
    this._urlsQueued = [];
    this._urlsExecuting = [];

    if (typeof this._concurrent !== "number" || this._concurrent <= 0) {
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
  private _run = async (
    url: URL | RequestInfo,
    options?: RequestInit
  ): Promise<Response> => {
    this._activeRequests++;
    try {
      if (this._debug) {
        this._urlsExecuting.push(url.toString());
        console.log("executing", this._urlsExecuting);
      }
      const response: Response = await fetch(url, options);
      if (this._debug) {
        const index = this._urlsExecuting.indexOf(url.toString());
        this._urlsExecuting.splice(index, 1);
      }
      return response;
    } finally {
      this._activeRequests--;
      this._emitRequestCompletedEvent();
    }
  };

  /**
   * Executes the next task in the queue when a fetch request is completed.
   */
  private _emitRequestCompletedEvent = (): void => {
    if (this._debug) {
      if (this._urlsQueued.length > 0) {
        console.log("queue", this._urlsQueued);
        this._urlsQueued.shift();
      }
    }
    if (this._queue.length <= 0) return;
    const nextTask = this._queue.shift();
    nextTask!();
  }
  
  /**
   * Returns the custom fetch function used by the FetchQueue class to handle queuing of fetch requests.
   * @returns The custom fetch function.
   */
  public getFetchMethod() {
    return this._f_fetch;
  }

  /**
   * @returns value of concurrent property
   */
  public getConcurrent() {
    return this._concurrent;
  }

  /**
   * set value of concurrent property
   * @param {number} concurrent
   */
  public setConcurrent(concurrent: number) {
    this._concurrent = concurrent;
  }

  /**
   * @returns value of debug property
   */
  public getDebug() {
    return this._debug;
  }

  /**
   * set value of debug property
   * @param {boolean} debug
   */
  public setDebug(debug: boolean) {
    this._debug = debug;
  }

  /**
   * @returns Length of queue
   */
  public getQueueLength() {
    return this._queue.length;
  }

  /**
   * The internal fetch implementation that handles queuing of fetch requests.
   */
  private _f_fetch = (() => {
    return (
      url: RequestInfo | URL,
      options?: RequestInit
    ): Promise<Response> => {
      const task = () => this._run(url, options);

      if (this._activeRequests < this._concurrent) {
        return task();
      } else {
        return new Promise((resolve, reject) => {
          const queueTask = () => {
            task().then(resolve).catch(reject);
          };
          this._queue.push(queueTask);
          if (this._debug) {
            this._urlsQueued.push(
              url.toString().split("/").slice(-3).join("/")
            );
          }
        });
      }
    };
  })();
}
