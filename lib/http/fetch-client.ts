import { errorFromResponse, errorFromTransport } from "./envelope";
import type { ClientConfig, HttpClient, RequestOptions } from "./port";

const DEFAULT_TIMEOUT_MS = 15_000;

function url(baseUrl: string, path: string, params: RequestOptions["params"]): string {
  const base = baseUrl.replace(/\/+$/, "");
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined) query.set(k, String(v));
  }
  const qs = query.toString();
  return `${base}${path.startsWith("/") ? path : `/${path}`}${qs ? `?${qs}` : ""}`;
}

export function createFetchClient(config: ClientConfig): HttpClient {
  async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const timeoutMs = options.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = AbortSignal.timeout(timeoutMs);
    // The caller's cancellation is combined with the timeout, never replaced —
    // a component unmounting and a slow server are both reasons to stop.
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const token = config.getAccessToken?.();
    if (token) headers.authorization = `Bearer ${token}`;
    if (options.body !== undefined) headers["content-type"] = "application/json";

    let response: Response;
    try {
      response = await fetch(url(config.baseUrl, path, options.params), {
        method,
        headers,
        signal,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (cause) {
      throw errorFromTransport(cause);
    }

    if (!response.ok) throw await errorFromResponse(response);
    if (response.status === 204) return undefined as T;

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    request,
    get: (path, options) => request("GET", path, options),
    post: (path, options) => request("POST", path, options),
    put: (path, options) => request("PUT", path, options),
    patch: (path, options) => request("PATCH", path, options),
    delete: (path, options) => request("DELETE", path, options),
  };
}
