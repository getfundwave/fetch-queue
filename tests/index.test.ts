import { FetchQueue } from "../src/index";
import { PreHook } from "../src/interfaces";

const urls = ["https://httpstat.us/500", "https://dummyjson.com/products/1", "https://dummyjson.com/products/2", "https://dummyjson.com/products/3"];

async function wait(time: number = 1200) {
  return new Promise((resolve) => {
    setTimeout(function () {
      return resolve(true);
    }, time);
  });
}

const TEST_TIMEOUT = 10000;

describe("FetchQueue", () => {
  // test
  it("should not initialize FetchQueue with negative concurrent value", () => {
    expect(() => new FetchQueue({ concurrent: -1 })).toThrow();
  }, TEST_TIMEOUT);

  // test
  it("should execute multiple fetch requests with expected queue lengths", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 1 });

    const fetch = fetchQueue.getFetchMethod();
    const mockFetch = jest.fn().mockImplementation(async (url, urlIndex) => {
      jest.advanceTimersByTime(5000);
      switch (urlIndex) {
        case 0:
        case 1:
          expect(fetchQueue.getQueueLength()).toBe(0);
          break;
        case 2:
          expect(fetchQueue.getQueueLength()).toBe(1);
          break;
        case 3:
          expect(fetchQueue.getQueueLength()).toBe(2);
          break;
      }
      return await fetch(url);
    });

    const promises = urls.map((url, urlIndex) => mockFetch(url, urlIndex));
    await Promise.all(promises);
  }, TEST_TIMEOUT);

  // test
  it("should execute multiple fetch requests successfully except one", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    const fetch = fetchQueue.getFetchMethod();

    const promises = urls.map(async (url) => fetch(url));
    const responses = await Promise.all(promises);

    expect(responses.filter((r: any) => r.status === 200)).toHaveLength(3);
    expect(responses.find((r: any) => r.status !== 200)).toBeDefined();
  }, TEST_TIMEOUT);

  // test
  it("should execute fetch requests with concurrency and after destroyQueue fetch requests parallel", async () => {
    let concurrent = 2;
    let startTime: Array<number> = [];
    let endTime: Array<number> = [];
    let queue: Array<() => void> = [];
    let activeRequests = 0;

    const run = async (url: URL | string): Promise<Response> => {
      activeRequests++;
      try {
        startTime.push(Date.now());
        const response = await require("node-fetch")(url);
        endTime.push(Date.now());
        return response;
      } catch (e) {
        throw e;
      } finally {
        activeRequests--;
        if (queue.length > 0) {
          const nextTask = queue.shift();
          nextTask!();
        }
      }
    };

    const f_fetch = (() => {
      return (url: URL | string): Promise<Response> => {
        if (activeRequests < concurrent) {
          return run(url);
        } else {
          return new Promise((resolve, reject) => {
            const queueTask = () => {
              run(url).then(resolve).catch(reject);
            };
            queue.push(queueTask);
          });
        }
      };
    })();

    const promises = urls.map((url) => f_fetch(url));
    await Promise.all(promises);

    expect(endTime[0] - startTime[2]).toBeLessThanOrEqual(10);
    expect(endTime[1] - startTime[3]).toBeLessThanOrEqual(10);
  }, 60000);

  afterEach(() => {
    jest.clearAllMocks();
  });
});

describe("test case with start and pause queue", () => {
  //test
  it("should not execute fetch request with disableQueue true in config", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2, pauseQueueOnInit: true });
    const fetch = fetchQueue.getFetchMethod();

    const mockFetch = jest.fn().mockImplementation(async (url, urlIndex) => {
      fetch(url);
      jest.advanceTimersByTime(5000);
      expect(fetchQueue.getActiveRequests()).toBe(0);
      switch (urlIndex) {
        case 0:
          expect(fetchQueue.getQueueLength()).toBe(1);
          break;
        case 1:
          expect(fetchQueue.getQueueLength()).toBe(2);
          break;
        case 2:
          expect(fetchQueue.getQueueLength()).toBe(3);
          break;
        case 3:
          expect(fetchQueue.getQueueLength()).toBe(4);
          break;
      }
      return Promise.resolve(true);
    });

    const promises = urls.map((url, urlIndex) => mockFetch(url, urlIndex));
    await Promise.all(promises);

    fetchQueue.startQueue();
    expect(fetchQueue.getQueueLength()).toBe(3);
  });

  // test
  it("execute a single fetch queue and pause others on completion", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    const fetch = fetchQueue.getFetchMethod();

    const mockFetch = jest.fn().mockImplementation(async (url, urlIndex) => {
      jest.advanceTimersByTime(5000);
      switch (urlIndex) {
        case 0:
          expect(fetchQueue.getActiveRequests()).toBe(0);
          expect(fetchQueue.getQueueLength()).toBe(0);
          break;
        case 1:
          expect(fetchQueue.getActiveRequests()).toBe(1);
          expect(fetchQueue.getQueueLength()).toBe(0);
          fetchQueue.pauseQueue();
          expect(fetchQueue.getQueueLength()).toBe(0);
          expect(fetchQueue.getActiveRequests()).toBe(0);
          break;
        case 2:
          expect(fetchQueue.getQueueLength()).toBe(1);
          expect(fetchQueue.getActiveRequests()).toBe(0);
          break;
        case 3:
          fetchQueue.startQueue();
          expect(fetchQueue.getQueueLength()).toBe(1);
          expect(fetchQueue.getActiveRequests()).toBe(1);
          break;
      }
      return Promise.resolve(fetch(url));
    });

    const promises = urls.map((url, urlIndex) => mockFetch(url, urlIndex));
    await Promise.all(promises);

    expect(fetchQueue.getQueueLength()).toBe(0);
  }, TEST_TIMEOUT);

  //test
  it("use emptyQueue", async () => {
    jest.useRealTimers();
    const fetchQueue = new FetchQueue({ concurrent: 1 });
    const fetch = fetchQueue.getFetchMethod();

    const mockFetch = jest.fn().mockImplementation(async (url, urlIndex) => {
      await wait();
      switch (urlIndex) {
        case 0:
          fetchQueue.pauseQueue();
          expect(fetchQueue.getQueueLength()).toBe(0);
          expect(fetchQueue.getActiveRequests()).toBe(0);
          break;
        case 1:
          expect(fetchQueue.getQueueLength()).toBe(1);
          expect(fetchQueue.getActiveRequests()).toBe(0);
          break;
        case 2:
          const regExp = /https:\/\/dummyjson\.com.*/g;
          fetchQueue.emptyQueue(regExp);
          expect(fetchQueue.getQueueLength()).toBe(0);
          expect(fetchQueue.getActiveRequests()).toBe(0);
          fetchQueue.startQueue();
          break;
        case 3:
          expect(fetchQueue.getQueueLength()).toBe(0);
          expect(fetchQueue.getActiveRequests()).toBe(1);
          break;
      }

      await fetch(url).catch(() => {});
    });

    const promises = urls.map(async (url, urlIndex) => await mockFetch(url, urlIndex));
    await Promise.all(promises);

    expect(fetchQueue.getQueueLength()).toBe(0);
  }, TEST_TIMEOUT);

  // test
  it("execute pre-fetch-hooks", async () => {
    jest.useRealTimers();

    const hook = jest.fn() as PreHook;
    
    const fetchQueue = new FetchQueue({ 
      concurrent: 1,
      pre: [{ pattern: new RegExp("https://dummyjson.com/products/\\d+"), hook }]
    });

    fetchQueue.startQueue();

    const fetch = fetchQueue.getFetchMethod();
    await Promise.allSettled([
      fetch("https://dummyjson.com/products/1"),
      fetch("https://dummyjson.com/test"),
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  }, TEST_TIMEOUT);

  // test
  it("queue relevant calls for patterns", async () => {
    jest.useRealTimers();

    const notToBeCalled = jest.fn() as PreHook;
    const toBeCalled = jest.fn() as PreHook;
    
    const fetchQueue = new FetchQueue({ 
      concurrent: 1,
      queuingPatterns: [ new RegExp("https://dummyjson.com/products/*") ],
      pre: [
        { pattern: new RegExp("https://dummyjson.com/products/\\d+"), hook: notToBeCalled },
        { pattern: new RegExp("https://dummyjson.com/test"), hook: toBeCalled },
      ]
    });

    fetchQueue.startQueue();
    fetchQueue.pauseQueue();

    const fetch = fetchQueue.getFetchMethod();
    fetch("https://dummyjson.com/products/1"),
    await fetch("https://dummyjson.com/test"),

    expect(notToBeCalled).toHaveBeenCalledTimes(0);
    expect(toBeCalled).toHaveBeenCalled();
  }, TEST_TIMEOUT);


  it("reference duplicate fetch to the original fetch in queue", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2, debug: false });
    const fetch = fetchQueue.getFetchMethod();
    fetchQueue.pauseQueue();

    const mockFetch = jest.fn().mockImplementation(async (url, urlIndex) => {
      if (urlIndex === 7) {
        expect(fetchQueue.getQueueLength()).toBe(5);
        fetchQueue.startQueue();
        expect(fetchQueue.getQueueLength()).toBe(4);
      }

      if (urlIndex === 5) {
        const options = { method: "POST" };
        return Promise.resolve(fetch(url, options));
      }

      return Promise.resolve(fetch(url));
    });

    const duplicateUrls = [...urls, ...urls];
    const promises = duplicateUrls.map((url, urlIndex) => mockFetch(url, urlIndex));
    const responses = await Promise.all(promises);

    expect(responses.length).toBe(8);
    responses.forEach((resp) => {
      if (resp.ok) expect(resp.json()).resolves.not.toBeNull();
    })
  }, TEST_TIMEOUT);
});
