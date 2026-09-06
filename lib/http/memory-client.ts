import { AppError } from "@/lib/kernel";
import type { HttpClient, RequestOptions } from "./port";

export type MemoryRequest = {
  method: string;
  path: string;
  params: Record<string, string | number | boolean | undefined>;
  body: unknown;
  headers: Record<string, string>;
};

/** A handler answers one route. Returning `undefined` means "not mine" and the
 *  next one is tried; falling off the end is a 404, exactly as it would be.
 *  Throwing an `AppError` is how a fixture refuses — the same value the fetch
 *  client produces from a real problem document. */
export type MemoryRoute = (request: MemoryRequest) => unknown;

export type MemoryConfig = {
  routes: MemoryRoute[];
  /** Simulated round trip. Non-zero by default so `pending` branches are
   *  reachable — a zero-latency fake makes them unreachable and they rot. */
  latencyMs?: number;
};

const DEFAULT_LATENCY_MS = 300;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("aborted", "AbortError"));
    }, { once: true });
  });
}

/** The in-memory adapter. Same port as `fetch-client`, no network, and it
 *  produces the same `AppError` values — so a screen cannot tell which one it
 *  is talking to. */
export function createMemoryClient(config: MemoryConfig): HttpClient {
  const latency = config.latencyMs ?? DEFAULT_LATENCY_MS;

  async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    await wait(latency, options.signal);

    const req: MemoryRequest = {
      method: method.toUpperCase(),
      path,
      params: options.params ?? {},
      body: options.body,
      headers: options.headers ?? {},
    };

    for (const route of config.routes) {
      const answer = route(req);
      if (answer !== undefined) return answer as T;
    }

    throw new AppError({
      kind: "not_found",
      message: `No fixture answers ${req.method} ${req.path}.`,
      status: 404,
    });
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
