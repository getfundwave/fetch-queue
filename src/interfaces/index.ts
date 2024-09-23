export type FetchQueueConfig = {
  fetch?: Function;
  concurrent?: number;
  pauseQueueOnInit?: boolean;
  debug?: boolean;
};
