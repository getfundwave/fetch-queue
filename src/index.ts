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
  #queue: Record<string, { controller: AbortController; promise: () => Promise<Response>; resolve: (value: unknown) => void; reject: (reason?: any) => void }> | undefined;

  /**
   * An array of strings representing the URLs in the queue.
   */
  #queueKeys: Array<string>;

  /**
   * If true, Disables task executions but {@link #queue} gets populated.
   */
  #pauseQueue: boolean;

  /**
   * Array of configs for pre-fetch-hooks
   */
  pre: Pre[];

  /**
   * Array of regex to queue matching requests; others run immediately.
   */
  #queuingPatterns: RegExp[];

  /**
   * Array of fetch parameters to build the queue key."
   */
  #keyBuilderParams: Array<string>;

  /**
   * Initializes a new instance of the FetchQueue class with an optional FetchQueueConfig object.
   * If no options are provided, the default concurrent value is set to 3.
   * @param {FetchQueueConfig} options - The FetchQueueConfig object containing the concurrent value.
   */
  constructor(options?: FetchQueueConfig) {
    this.#concurrent = options?.concurrent || 3;
    this.#debug = options?.debug || false;
    this.#activeRequests = 0;
    this.#queue = undefined;
    this.#queueKeys = [];
    this.#urlsExecuting = new Set<string>();
    this.#pauseQueue = options?.pauseQueueOnInit || false;
    const pre = Array.isArray(options?.pre) ? options?.pre : [];
    this.pre = pre!;
    const queuingPatterns = Array.isArray(options?.queuingPatterns) ? options?.queuingPatterns : [];
    this.#queuingPatterns = queuingPatterns!;

    this.#keyBuilderParams = options?.keyBuilderParams || ["url", "options.method", "options.body"];

    if (typeof this.#concurrent !== "number" || this.#concurrent <= 0) {
      throw new Error("Concurrent should be a number greater than zero.");
    }
  }

  /**
   * handle to log message if debug is set to true
   **/
  #debugLog = (...params: Parameters<typeof console.log>) => {
    if (this.#debug) console.log("[fetchq]", ...params);
  };

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
        this.#debugLog("executing request: ", url.toString());
      }

      if (!!controller && controller.signal.aborted) {
        this.#debugLog("aborted request: ", this.#urlsExecuting.delete(url.toString()));
        throw new Error("Aborted");
      }

      this.#activeRequests++;

      if (this.pre.length) await this.#executePre(url, options);
      const response: Response = await fetch(url, options);

      if (this.#debug) this.#urlsExecuting.delete(url.toString());

      return response;
    } finally {
      if (this.#activeRequests === 0) console.warn("[DANGER] active-requests shouldn't be less than 0", url.toString());
      else this.#activeRequests--;
      this.#emitRequestCompletedEvent();
    }
  };

  /**
   * Executes relevant pre-fetch hooks based on url-patterns.
   */
  #executePre = async (url: URL | RequestInfo, options?: RequestInit) => {
    if (this.pre.length < 0) return;

    return Promise.all(
      this.pre.map(async (pre) => {
        const regexMatchFailed = pre.pattern instanceof RegExp && !pre.pattern.test(url.toString());
        const regexMatchesFailed = Array.isArray(pre.pattern) && !pre.pattern.some((pattern) => pattern instanceof RegExp && pattern.test(url.toString()));
        const matchFailed = pre.pattern instanceof RegExp ? regexMatchFailed : regexMatchesFailed;

        this.#debugLog("match result for %s", url.toString(), pre.pattern, { matchFailed, regexMatchFailed, regexMatchesFailed });
        if (matchFailed) return;

        this.#debugLog("processing pre-hooks @ ", url.toString());
        return pre.hook(url, options);
      })
    );
  };

  /**
   * Executes the next task in the queue when a fetch request is completed.
   */
  #emitRequestCompletedEvent = (): void => {
    if (!this.#queue || this.#queueKeys.length <= 0) return this.#debugLog("nothing in queue to process");
    if (this.#pauseQueue) return this.#debugLog("queue paused! %d to be processed after resumption", this.#queueKeys.length);

    const requestKey = this.#queueKeys.shift()!;
    const request = this.#queue?.[requestKey];

    request.promise().then(request.resolve).catch(request.reject);

    this.#debugLog("moving to next-item in queue", { activeRequests: this.#activeRequests, queueLength: this.#queueKeys.length });
    delete this.#queue?.[requestKey];

    if (this.#queueKeys.length === 0 || Object.keys(this.#queue).length === 0) {
      this.#queue = undefined;
    }
  };

  /**
   * Builds a unique key for a fetch request based on the provided parameters.
   *
   * @param parameters - An object containing the parameters to be included in the key.
   * @returns A string representing the unique key for the fetch request.
   */
  #keyBuilder = (parameters: Record<string, any>) => {
    const requestKey: Record<string, any> = {};

    this.#keyBuilderParams.forEach((key) => {
      const nestedKeys = key?.split(".");
      const nestedLength = nestedKeys.length;
      const value = nestedKeys.reduce((obj, k) => (obj ? obj?.[k] : null), parameters);

      nestedKeys.reduce((acc, curr, index) => {
        acc[curr] = index === nestedLength - 1 ? value : {};

        return acc[curr];
      }, requestKey);
    });

    return JSON.stringify(requestKey);
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
    if (!this.#queue) return;

    for (const requestKey of this.#queueKeys) {
      const request = this.#queue[requestKey];
      const url = JSON.parse(requestKey).url;

      if (!urlPattern) request.controller.abort();
      else if (!!urlPattern && url.match(urlPattern)) request.controller.abort();

      request.promise().then(request.resolve).catch(request.reject);
    }

    this.#queue = undefined;
    this.#queueKeys = [];
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
    return Object.keys(this.#queue || {}).length;
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
      const bypassQueue = patternsExistForEvaluation && !this.#queuingPatterns.some((pattern) => pattern.test(url.toString()));

      if (this.#activeRequests < this.#concurrent && !this.#pauseQueue) this.#debugLog("bandwidth available! executing:", url.toString());
      else if (bypassQueue) this.#debugLog("bypassing queue for:", url.toString());
      if ((this.#activeRequests < this.#concurrent && !this.#pauseQueue) || bypassQueue) {
        return executeFetchRequest(controller);
      }

      // queue map key for the promise
      const requestKey = this.#keyBuilder({ url, options });

      return new Promise((resolve, reject) => {
        let resolveHandler = resolve;
        let rejectHandler = reject;

        // if promise exists in queue, then update the promise resolve and reject methods
        if (this.#queueKeys.includes(requestKey) && this.#queue?.[requestKey]?.promise) {
          const previousResolveHandler = this.#queue[requestKey].resolve;
          const previousRejectHandler = this.#queue[requestKey].reject;

          resolveHandler = (value: unknown) => {
            previousResolveHandler(value);
            resolve((value as Response)?.clone());
          };

          rejectHandler = (reason?: any) => {
            previousRejectHandler(reason);
            reject(reason);
          };
        }

        const queueTask = () => executeFetchRequest(controller);

        this.#debugLog("request queued:", url.toString());

        // store promise in queue
        this.#queue = { ...this.#queue, [requestKey]: { controller, promise: queueTask, resolve: resolveHandler, reject: rejectHandler } };
        this.#queueKeys = Object.keys(this.#queue);
      });
    };
  })();
}
