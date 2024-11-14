import { RequestInfo, RequestInit } from "node-fetch";

export type PreHook = (url: URL | RequestInfo, options?: RequestInit) => void;
export type Pre = { pattern: RegExp | RegExp[]; hook: PreHook };

export type FetchQueueConfig = {
  concurrent: number;
  pauseQueueOnInit?: boolean;
  pre?: Pre[];
  queuingPatterns?: RegExp[];
  debug?: boolean;
  keyBuilderParams?: Array<string>;
};
