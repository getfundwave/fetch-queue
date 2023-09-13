# fetch-queue

@fundwave/fetch-queue is a client-side library that allows you to queue your app's fetch requests 

## Installation Instructions

```sh
npm install @fundwave/fetch-queue
```

### Initialization

```js
import { FetchQueue as ApiFetchQueue } from "@fundwave/fetch-queue";

// value of concurrent defaults to 3
// concurrent defines the number of fetch requests to be send to server at a time
const FetchQueue = ApiFetchQueue({ concurrent: 2 });
FetchQueue.initQueue();

// Note: Works with node.js fetch for now.
```
