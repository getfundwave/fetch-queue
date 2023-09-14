import { FetchQ, FetchQueueConfig } from "./interfaces/index.js";

export class FetchQueue {
  concurrent: number;
  activeRequests: number;
  queue: Array<() => void>;

  constructor(options: FetchQueueConfig) {
    this.concurrent = options?.concurrent || 3;
    this.activeRequests = 0;
    this.queue = [];
  }

  run = async (
    url: RequestInfo | URL,
    fetch: FetchQ,
    options?: RequestInit
  ): Promise<Response> => {
    this.activeRequests++;
    console.log(this.activeRequests, Date.now(), this.concurrent);
    try {
      const response: Response = await fetch(url, options);
      return response;
    } finally {
      this.activeRequests--;
      if (this.queue.length > 0) {
        const nextTask = this.queue.shift();
        nextTask!();
      }
    }
  };

  initQueue() {
    global.fetch = this.f_fetch;
  }

  private f_fetch = (() => {
    const fetch = window.fetch;

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
        });
      }
    };
  })();
}
