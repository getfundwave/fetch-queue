# fetchq

A client-side library that allows you to queue fetch requests.

## Installation

```sh
npm install fetchq
```

## Initialization

```js
import { FetchQueue } from "fetchq";

const MyFetchQueue = new FetchQueue({ concurrent: 2 });
MyFetchQueue.initQueue(); //override global `fetch` with `fetchq`
```

## Options

| Property   | Description                         | Default Value |
| ---------- | ----------------------------------- | ------------- |
| concurrent | number of concurrent fetch requests | 3             |



