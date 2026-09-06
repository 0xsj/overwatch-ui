export type ClientConfig = {
  /** Origin plus any mount path. A trailing slash is ignored; request paths are
   *  appended, never resolved against it. */
  baseUrl: string;
  timeoutMs?: number;
  /** Read lazily on every request, so a refreshed token is picked up without
   *  rebuilding the client. */
  getAccessToken?: () => string | null | undefined;
};

export type RequestOptions = {
  /** `undefined` values are dropped rather than sent as the string
   *  "undefined", so an absent cursor can be passed straight through. */
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** The caller's own cancellation. Combined with the timeout, not replaced. */
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

/** The port. Everything above `http` depends on this type and never on an
 *  implementation of it — `lib/root` is the only place that picks one. Two
 *  adapters satisfy it: `fetch-client` and `memory-client`. */
export type HttpClient = {
  request<T>(method: string, path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, options?: RequestOptions): Promise<T>;
  put<T>(path: string, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
};
