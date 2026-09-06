/** The wire spellings of `pkg/errors.Kind`, in the order the Go file declares
 *  them. A transcription, not a second taxonomy — see doc.ts. */
export const ERROR_KINDS = [
  "internal",
  "invalid",
  "not_found",
  "conflict",
  "unauthenticated",
  "forbidden",
  "rate_limited",
  "unavailable",
  "timeout",
  "canceled",
  "unprocessable",
  "precondition_failed",
  "precondition_required",
] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

export function isErrorKind(value: unknown): value is ErrorKind {
  return typeof value === "string" && (ERROR_KINDS as readonly string[]).includes(value);
}

/** `Kind.Retryable()`, copied. Three kinds, and the client is a caller. */
export function isRetryable(kind: ErrorKind): boolean {
  return kind === "unavailable" || kind === "rate_limited" || kind === "timeout";
}

export type AppErrorInit = {
  kind: ErrorKind;
  message: string;
  /** A domain slug the server may attach. Stable, and the thing to branch on. */
  type?: string;
  /** Per-field messages. Absent, never `{}`, when the failure names no field. */
  fields?: Record<string, string>;
  requestId?: string;
  /** Absent when nothing HTTP happened — a transport failure, or an abort. */
  status?: number;
};

export class AppError extends Error {
  /** A literal tag beside `instanceof`, and the reason is narrower than it looks.
   *
   *  This class is emitted into five separate chunks in the current build —
   *  counted, not guessed. It is still ONE class at runtime, because all five
   *  register it under the same module id and the runtime instantiates by id.
   *  So `instanceof` alone would work today.
   *
   *  The tag is here because `instanceof` is identity-based and this value sits
   *  one `catch` away from boundaries where identity is not preserved: a
   *  different runtime, a worker, or anything that serialises. When it fails it
   *  fails SILENTLY, onto the generic "something went wrong" branch, which is the
   *  worst place for a failure to land. A structural check costs one field.
   *
   *  See notes/substrate/turbopack-module-identity.md — the first version of this
   *  comment asserted the duplication caused two classes, and measuring it showed
   *  that was wrong. */
  readonly _tag = "AppError" as const;
  readonly kind: ErrorKind;
  readonly type?: string;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;
  readonly status?: number;

  constructor(init: AppErrorInit) {
    super(init.message);
    this.name = "AppError";
    this.kind = init.kind;
    this.type = init.type;
    this.fields = init.fields;
    this.requestId = init.requestId;
    this.status = init.status;
  }

  get retryable(): boolean {
    return isRetryable(this.kind);
  }
}

export function isAppError(value: unknown): value is AppError {
  if (value instanceof AppError) return true;
  // Structural fallback, for the cross-bundle case above. Checks the tag AND a
  // real kind, so an object that merely borrowed the name does not qualify.
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _tag?: unknown })._tag === "AppError" &&
    isErrorKind((value as { kind?: unknown }).kind)
  );
}
