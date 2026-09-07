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

/** The bearer off a request, or null. One helper so no route re-parses the
 *  header and gets the prefix subtly wrong. */
export function bearerOf(request: MemoryRequest): string | null {
  const raw = request.headers.authorization ?? request.headers.Authorization;
  const match = /^Bearer (.+)$/.exec(String(raw ?? ""));
  return match ? match[1] : null;
}

export type MemoryConfig = {
  routes: MemoryRoute[];
  /** Read lazily on every request and put on the `authorization` header, exactly
   *  as `fetch-client` does with the same signature.
   *
   *  Without it a fixture cannot tell one caller from another, and every route
   *  has to answer for a single imaginary tenant. With it the fixture's identity
   *  arrives the same way the real one does, so the seam is symmetric: a route
   *  reads a bearer, and neither the service above nor the screen above that
   *  knows which adapter answered. */
  getAccessToken?: () => string | null | undefined;
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

    const headers: Record<string, string> = { ...options.headers };
    const token = config.getAccessToken?.();
    if (token) headers.authorization = `Bearer ${token}`;

    const req: MemoryRequest = {
      method: method.toUpperCase(),
      path,
      params: options.params ?? {},
      body: options.body,
      headers,
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
