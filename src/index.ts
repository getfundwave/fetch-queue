import fetch, { RequestInfo, RequestInit, Response } from "node-fetch";
import { FetchQueueConfig, Pre } from "./interfaces/index.js";
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
  #urlsQueued: Array<{ url: string; controller: AbortController }>;

  /**
   * An array of strings representing the URLs executing.
   */
  #urlsExecuting: Set<string>;

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
   * Array of configs for pre-fetch-hooks
   */
  pre: Pre[];
  
  /**
   * Array of regular-expressions evaluate
   */
  #queuingPatterns: RegExp[];

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
    this.#urlsExecuting = new Set<string>();
    this.#pauseQueue = options?.pauseQueueOnInit || false;
    const pre = Array.isArray(options?.pre) ? options?.pre : [];
    this.pre = pre!;
    const queuingPatterns = Array.isArray(options?.queuingPatterns) ? options?.queuingPatterns : [];
    this.#queuingPatterns = queuingPatterns!;

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
  #run = async (url: URL | RequestInfo, options?: RequestInit, controller?: AbortController): Promise<Response> => {
    try {
      if (this.#debug) {
        this.#urlsExecuting.add(url.toString());
        console.log("executing", this.#urlsExecuting);
      }

      if (!!controller && controller.signal.aborted) {
        if (this.#debug) this.#urlsExecuting.delete(url.toString());
        throw new Error("Aborted");
      }

      if (this.pre.length) await this.#executePre(url, options);

      this.#activeRequests++;
      const response: Response = await fetch(url, options);

      if (this.#debug) this.#urlsExecuting.delete(url.toString());

      return response;
    } finally {
      this.#activeRequests--;
      this.#emitRequestCompletedEvent();
    }
  };

  /**
   * Executes relevant pre-fetch hooks based on url-patterns.
   */
  #executePre = async (url: URL | RequestInfo, options?: RequestInit) => {
    if (this.pre.length < 0) return;

    return Promise.all(this.pre.map(async (pre) => {
      if (pre.pattern instanceof RegExp && !pre.pattern.test(url.toString())) return;
      if (Array.isArray(pre.pattern) && !pre.pattern.some(pattern => pattern instanceof RegExp && pattern.test(url.toString()))) return;
      if (this.#debug) console.log("Processing pre-fetch hooks for: ", url.toString());
      return pre.hook(url, options);
    }));
  }

  /**
   * Executes the next task in the queue when a fetch request is completed.
   */
  #emitRequestCompletedEvent = (): void => {
    if (this.#debug) console.log("queue", this.#urlsQueued);

    if (this.#queue.length <= 0 || this.#pauseQueue) return;

    this.#urlsQueued.shift();
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
   * Empties the queue of fetch requests.
   *
   * @param urlPattern - Optional regular expression to match against the URLs in the queue.
   * If provided, only the requests with URLs that match the pattern will be aborted.
   * If not provided, all requests in the queue will be aborted.
   */
  public emptyQueue(urlPattern?: RegExp) {
    this.#urlsQueued.forEach((request) => {
      if (!urlPattern) request.controller.abort();
      else if (!!urlPattern && request.url.match(urlPattern)) request.controller.abort();
    });

    this.#queue.forEach((task) => task());

    this.#urlsQueued = [];
    this.#queue = [];
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
   * @returns {void}
   */
  public startQueue(): void {
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
    return (url: RequestInfo | URL, options?: RequestInit) => {
      const controller = new AbortController();
      const executeFetchRequest = (controller: AbortController) => this.#run(url, options, controller);

      const patternsExistForEvaluation = Boolean(this.#queuingPatterns.length);
      const bypassQueue = patternsExistForEvaluation && !this.#queuingPatterns.some(pattern => pattern.test(url.toString()));

      if ((this.#activeRequests < this.#concurrent && !this.#pauseQueue) || bypassQueue) {
        return executeFetchRequest(controller);
      }

      return new Promise((resolve, reject) => {
        const queueTask = () => {
          executeFetchRequest(controller).then(resolve).catch(reject);
        };
        this.#queue.push(queueTask);
        this.#urlsQueued.push({ url: url.toString(), controller });
      });
    };
  })();
}
