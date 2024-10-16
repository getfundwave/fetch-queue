import { RequestInfo, RequestInit } from "node-fetch";

export type PreFetchHook = (url: URL | RequestInfo, options?: RequestInit) => void;
export type PreFetchHookConfig = { pattern: RegExp, hook: PreFetchHook };

export type FetchQueueConfig = {
  concurrent: number;
  pauseQueueOnInit?: boolean;
  preFetchHooks?: PreFetchHookConfig[];
  debug?: boolean;
};
