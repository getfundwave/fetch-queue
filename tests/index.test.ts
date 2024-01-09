import { FetchQueue } from "../src/index";

const urls = ["https://example.com/", "https://github.com/", "https://example.com/3", "https://google.com/"];

describe("FetchQueue", () => {
  // test
  it("should not initialize FetchQueue with negative concurrent value", () => {
    expect(() => new FetchQueue({ concurrent: -1 })).toThrow();
  });

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
      return Promise.resolve(await fetch(url));
    });

    const promises = urls.map((url, urlIndex) => mockFetch(url, urlIndex));
    await Promise.all(promises);
  });

  // test
  it("should execute multiple fetch requests successfully except one", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    const fetch = fetchQueue.getFetchMethod();

    const promises = urls.map(async (url) => fetch(url));
    const responses = await Promise.all(promises);

    expect(responses.filter((r) => r.status === 200)).toHaveLength(3);
    expect(responses.find((r) => r.status === 404)).toBeDefined();
  });

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
        startTime.push(new Date().getTime());
        const response = await require("node-fetch")(url);
        endTime.push(new Date().getTime());
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
      switch (urlIndex) {
        case 0:
        case 1:
          expect(fetchQueue.getActiveRequests()).toBe(0);
          break;
        case 2:
          expect(fetchQueue.getActiveRequests()).toBe(0);
          expect(fetchQueue.getQueueLength()).toBe(3);
          break;
        case 3:
          expect(fetchQueue.getActiveRequests()).toBe(0);
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
  });
});
