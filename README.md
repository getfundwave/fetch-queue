# @fundwave/fetchq

A client-side library that allows you to queue fetch requests.

## Installation

```sh
npm install @fundwave/fetchq
```

## Initialization

```js
import { FetchQueue } from "@fundwave/fetchq";

const MyFetchQueue = new FetchQueue({ concurrent: 2 });
MyFetchQueue.createQueue(); // Assigns the custom fetch function to the global fetch variable.
```

## Options

| `Property` | `Description`                       | `Default Value` |
| ---------- | ----------------------------------- | --------------- |
| concurrent | number of concurrent fetch requests | 3               |
| debug      | set debug mode                      | false           |

## Usage

### Dispose queue

The `createQueue()` method sets the global fetch function to the custom fetch function of the `FetchQueue` class, while the `disposeQueue()` method resets the queue and sets the global fetch function back to the original fetch function.

```js
import { FetchQueue } from "@fundwave/fetchq";

const fetchQueue = new FetchQueue();
fetchQueue.createQueue();

// ... perform fetch requests using the custom fetch function ...

fetchQueue.disposeQueue(); // Clears the queue and restores the original fetch function.
```

### Get custom fetch function

The `getFetch` method returns the custom fetch function used by the `FetchQueue` class to handle queuing of fetch requests.

```js
import { FetchQueue } from "@fundwave/fetchq";

const fetchQueue = new FetchQueue();
const customFetch = fetchQueue.getFetch();

const url = "..."
const options = {...}
let response = await customFetch(url, options);
```
