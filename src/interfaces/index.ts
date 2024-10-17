import { RequestInfo, RequestInit } from "node-fetch";

export type PreFetchHook = (url: URL | RequestInfo, options?: RequestInit) => void;
export type PreFetchHookConfig = { pattern: RegExp | RegExp[], hook: PreFetchHook };

export type FetchQueueConfig = {
  concurrent: number;
  pauseQueueOnInit?: boolean;
  preFetchHooks?: PreFetchHookConfig[];
  queuingPatterns?: RegExp[];
  debug?: boolean;
};
