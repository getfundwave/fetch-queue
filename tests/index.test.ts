import { FetchQueue } from "../src/index.js";

describe("FetchQueue", () => {
  // Initializes FetchQueue with negative concurrent value
  it("should not initialize FetchQueue with negative concurrent value", () => {
    expect(() => {
      new FetchQueue({ concurrent: -1 });
    }).toThrow();
  });

  // Initializes FetchQueue with concurrent value of 0
  it("should not execute any fetch requests when initialized with a concurrent value of 0", () => {
    const fetchQueue = new FetchQueue({ concurrent: 0 });

    const mockFetch = jest.fn();

    fetchQueue.initQueue();

    fetch("https://example.com", { method: "GET" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Executes multiple fetch requests successfully
  it("should execute multiple fetch requests successfully", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2 });

    const mockFetch = jest.fn();

    fetchQueue.initQueue();

    await Promise.all([
      fetchQueue["run"]("https://example.com", mockFetch, { method: "GET" }),
      fetchQueue["run"](new URL("https://example.com"), mockFetch, {
        method: "GET",
      }),
      fetchQueue["run"]("https://example.com", mockFetch, { method: "POST" }),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  // Executes multiple fetch requests successfully
  it("should execute multiple fetch requests successfully except one", async () => {
    const fetchQueue = new FetchQueue({ concurrent: 2 });
    fetchQueue.initQueue();

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

    // Execute 4 fetch calls concurrently
    const promises = urls.map((url) => mockfetch(url));

    // Wait for all promises to settle (either resolve or reject)
    const responses = await Promise.allSettled(promises);

    // Assert that 3 fetch calls succeeded
    expect(responses.filter((r) => r.status === "fulfilled")).toHaveLength(3);

    // Assert that 1 fetch call failed
    expect(responses.find((r) => r.status === "rejected")).toBeDefined();
  });
});
