# @fundwave/fetchq

A client-side library that allows you to queue fetch requests.

- Supports ES modules
- Supports CommonJS

## Installation

```sh
npm install @fundwave/fetchq
```

## Initialization

```js
import { FetchQueue } from "@fundwave/fetchq";

const MyFetchQueue = new FetchQueue({ concurrent: 2 });
// returns custom fetch function with queueing enabled.
const fetch = MyFetchQueue.getFetchMethod();
```

## Options

| `Property` | `Description`                       | `Default Value` |
| ---------- | ----------------------------------- | --------------- |
| concurrent | number of concurrent fetch requests | 3               |
| debug      | set debug mode                      | false           |

## Usage

```js
import { FetchQueue } from "@fundwave/fetchq";

const fetchQueue = new FetchQueue(); // concurent defaults to 3
const customFetch = fetchQueue.getFetchMethod();

const urls = [...]
const options = {...}

const promises = urls.map(async (url) => await customFetch(url, options))
const responses = await Promise.all(promises);
```

```js
// get queue length at real time
console.log(fetchQueue.getQueueLength());
```

```js
// getters and setters
fetchQueue.setConcurrent(5);
console.log(fetchedQueue.getConcurrent()); // output: 5

fetchQueue.setDebug(true);
console.log(fetchedQueue.getDebug()); // output: true
```

```js
// start and pause queue
const fetchQueue = new FetchQueue(concurrent: 3, pauseQueueOnInit: true);
const customFetch = fetchQueue.getFetchMethod();

// ...some calls
fetchQueue.startQueue();

// ...some calls
fetcheQueue.pauseQueue();
```