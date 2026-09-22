import { AppError, isErrorKind, type ErrorKind } from "../kernel/errors.ts";

/** The problem document `pkg/httpx.WriteError` writes. FLAT — `kind` is a
 *  top-level key, not nested under `error`. This is the only file in the tree
 *  permitted to name a wire key. */
type Problem = {
  kind?: unknown;
  message?: unknown;
  type?: unknown;
  fields?: unknown;
  request_id?: unknown;
};

/** The server's own `httpx.Status` mapping, inverted. Used ONLY when the body
 *  is not a problem document — a proxy's 502, an HTML error page, a gateway
 *  timeout. When the body carries `kind`, that wins, because the server has
 *  already classified and a second classification here would drift. */
function kindFromStatus(status: number): ErrorKind {
  switch (status) {
    case 400: return "invalid";
    case 401: return "unauthenticated";
    case 403: return "forbidden";
    case 404: return "not_found";
    case 409: return "conflict";
    case 412: return "precondition_failed";
    case 422: return "unprocessable";
    case 428: return "precondition_required";
    case 429: return "rate_limited";
    case 499: return "canceled";
    case 503: return "unavailable";
    case 504: return "timeout";
    default: return "internal";
  }
}

function stringMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const MAX_RETRY_AFTER_MS = 60_000;

/** Parse RFC 7231's delta-seconds or HTTP-date form, but cap the result so a
 * server or proxy cannot make a browser silently sleep for an unbounded time. */
function retryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value.trim());
  if (Number.isInteger(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return undefined;
  return Math.min(Math.max(0, at - Date.now()), MAX_RETRY_AFTER_MS);
}

/** Turn a non-2xx response into an `AppError`. Never throws on a malformed
 *  body: an error path that can itself fail replaces one diagnosis with a
 *  worse one. */
export async function errorFromResponse(response: Response): Promise<AppError> {
  let problem: Problem = {};
  try {
    const text = await response.text();
    if (text) problem = JSON.parse(text) as Problem;
  } catch {
    /* not JSON, or the body was already consumed — fall through to the status */
  }

  const kind = isErrorKind(problem.kind) ? problem.kind : kindFromStatus(response.status);

  return new AppError({
    kind,
    message: str(problem.message) ?? response.statusText ?? "Request failed",
    type: str(problem.type),
    fields: stringMap(problem.fields),
    // The body's id first, then the header. `httpx.WriteError` puts it in the
    // body, but a 404 from the mux and anything a proxy writes have no body at
    // all — and the middleware still sets X-Request-Id. Measured against the
    // running server: a 404 for an unbuilt route carries the header and a
    // text/plain body, so without this fallback the one traceable fact is lost
    // exactly when the route is missing.
    requestId: str(problem.request_id) ?? response.headers.get("x-request-id") ?? undefined,
    status: response.status,
    retryAfterMs: retryAfterMs(response.headers.get("retry-after")),
  });
}

/** A failure with no response: DNS, a dropped socket, a timeout, an abort.
 *
 * AbortSignal.timeout() deliberately throws a DOMException named
 * `TimeoutError`, not `AbortError`. Keeping that distinction matters to the
 * retry policy and to the UI: a slow boundary is recoverable in a different
 * way from a component that was unmounted or a user-cancelled request. */
export function errorFromTransport(cause: unknown): AppError {
  if (cause instanceof DOMException) {
    if (cause.name === "TimeoutError") {
      return new AppError({ kind: "timeout", message: "The request timed out. Try again." });
    }
    if (cause.name === "AbortError") {
      return new AppError({ kind: "canceled", message: "The request was cancelled." });
    }
  }
  return new AppError({
    kind: "unavailable",
    message: cause instanceof Error ? cause.message : "The server could not be reached.",
  });
}
