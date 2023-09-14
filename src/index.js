export class FetchQueue {
  constructor(options) {
    this.concurrent = options?.concurrent || 3;
    this.priority = options?.priority || {};
  }

  initQueue() {
    globalThis.fetch = this._f_fetch;
  }

  _f_fetch = (() => {
    const fetch = window.fetch;
    let activeRequests = 0;
    const queue = [];

    const run = async (url, options) => {
      activeRequests++;
      try {
        const response = await fetch(url, options);
        return response;
      } finally {
        activeRequests--;
        if (queue.length > 0) {
          const nextTask = queue.shift();
          nextTask();
        }
      }
    };

    return (url, options) => {
      const task = () => run(url, options);

      if (activeRequests < this.concurrent) {
        return task();
      } else {
        return new Promise((resolve, reject) => {
          queue.push(() => {
            task().then(resolve).catch(reject);
          });
        });
      }
    };
  })();
}
