import { FetchQueue } from "../src/index";

describe("FetchQueue", () => {
  // test
  it("should not initialize FetchQueue with negative concurrent value", () => {
    expect(() => new FetchQueue({ concurrent: -1 })).toThrow();
  });

  // test
  it("should execute multiple fetch requests with expected queue lengths", async () => {
    jest.useFakeTimers();
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    const urls = [
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4",
    ];
    fetchQueue.createQueue();
    const fetch = fetchQueue.getFetchMethod();
    const mockFetch = jest.fn().mockImplementation(async (url, urlIndex) => {
      jest.advanceTimersByTime(5000);
      switch (urlIndex) {
        case 1:
        case 2:
          expect(fetchQueue.getQueueLength()).toBe(0);
          break;
        case 3:
          expect(fetchQueue.getQueueLength()).toBe(1);
          break;
        case 4:
          expect(fetchQueue.getQueueLength()).toBe(2);
          break;
      }
      return Promise.resolve(await fetch(url));
    });

    const promises = urls.map((url) => mockFetch(url, urls.indexOf(url)));
    await Promise.all(promises);
  });

  // test
  it("should execute multiple fetch requests successfully except one", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    fetchQueue.createQueue();

    const urls = [
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4",
    ];

    // Mock the fetch function to simulate success for the first three calls and failure for the fourth call.
    const mockfetch = jest.fn().mockImplementation((url) => {
      if (url === urls[3]) {
        return Promise.reject("Fetch failed"); // Simulate a failed fetch
      }
      return Promise.resolve({ status: 200, text: () => "Mocked response" });
    });

    const promises = urls.map((url) => mockfetch(url));

    // Wait for all promises to settle (either resolve or reject)
    const responses = await Promise.allSettled(promises);

    // Assert that 3 fetch calls succeeded
    expect(responses.filter((r) => r.status === "fulfilled")).toHaveLength(3);

    // Assert that 1 fetch call failed
    expect(responses.find((r) => r.status === "rejected")).toBeDefined();
  });

  // test
  it("should destroy queue when destroyQueue is called without creating a queue", () => {
    const fetchQueue = new FetchQueue();
    fetchQueue.destroyQueue();
    expect(fetchQueue.getQueueLength()).toEqual(0);
  });

  it("should execute fetch requests with concurrency and after destroyQueue fetch requests parallel", async () => {
    // jest.useFakeTimers();
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    const urls = [
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4",
    ];
    fetchQueue.createQueue();

    let startTime = new Date().getTime();
    const promises = urls.map((url) =>
      new Promise((resolve, reject) =>
        setTimeout(async () => {
          resolve(await fetch(url));
        }, 300 * (urls.indexOf(url) + 1))
      ).finally(() => {
        const time = new Date().getTime();
        console.log(time-startTime, url)
        switch (urls.indexOf(url)) {
          case 1:
            // expect(time - startTime).toBeLessThanOrEqual(150);
            break;
          case 2:
            // expect(time - startTime).toBeLessThanOrEqual(250);
            break;
          case 3:
            // expect(time - startTime).toBeLessThanOrEqual(450);
            break;
          case 4:
            // expect(time - startTime).toBeLessThanOrEqual(650);
            break;
        }
      })
    );
    startTime = new Date().getTime();
    await Promise.all([...promises]);

    fetchQueue.destroyQueue();
    const newPromises = urls.map((url) =>
      new Promise((resolve, reject) =>
        setTimeout(async () => {
          resolve(await fetch(url));
        }, 300 * (urls.indexOf(url) + 1))
      ).finally(() => {
        const time = new Date().getTime();
        console.log(time-startTime, url)
        switch (urls.indexOf(url)) {
          case 1:
            // expect(time - startTime).toBeLessThanOrEqual(150);
            break;
          case 2:
            // expect(time - startTime).toBeLessThanOrEqual(250);
            break;
          case 3:
            // expect(time - startTime).toBeLessThanOrEqual(450);
            break;
          case 4:
            // expect(time - startTime).toBeLessThanOrEqual(650);
            break;
        }
      })
    );
    startTime = new Date().getTime();
    await Promise.all([...newPromises]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });
});
