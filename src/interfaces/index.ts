export type FetchQueueConfig = {
  concurrent: number;
  debug?: boolean;
};

export type FetchQ = (
  url: RequestInfo | URL,
  options?: RequestInit
) => Promise<Response>;
