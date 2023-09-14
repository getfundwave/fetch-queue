export type FetchQueueConfig = {
    concurrent: number
}

export type FetchQ = (url: RequestInfo | URL, options?: RequestInit) => Promise<Response>