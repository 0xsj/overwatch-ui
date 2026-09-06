import { isAppError } from "@/lib/kernel";

/** The shape a form's action returns.
 *
 *  A discriminated union on `status`, and the error arm is discriminated again on
 *  `scope`. That second tag is the interesting one: it makes *"exactly one of the
 *  form-level message and the field-level messages renders"* a fact the compiler
 *  holds, rather than a convention two files had to agree on.
 *
 *  This lives OUTSIDE `_actions.ts` because that file carries "use server", and a
 *  "use server" module may export async functions and nothing else — a constant
 *  there fails at request time with "can only export async functions, found
 *  object", long after the build has passed. */
export type FormState =
  | { status: "idle" }
  | { status: "ok" }
  /** No field was named. The message belongs to the form. */
  | { status: "error"; scope: "form"; message: string }
  /** At least one field was named. `fields` is REQUIRED on this arm, so a caller
   *  never reaches for it optionally. */
  | { status: "error"; scope: "fields"; message: string; fields: Record<string, string> };

export const initialFormState: FormState = { status: "idle" };

/** The one place a thrown `AppError` becomes a value again, and the one place
 *  the scope is decided.
 *
 *  `http` throws because that is what a fetch wrapper and a cache library both
 *  want; a form wants a value it can render. Deciding the scope here rather than
 *  at each call site is what lets the union above be exact — `fields` is present
 *  on the wire or it is not, and that question is answered once. */
export function toFormState(error: unknown): FormState {
  if (isAppError(error)) {
    return error.fields
      ? { status: "error", scope: "fields", message: error.message, fields: error.fields }
      : { status: "error", scope: "form", message: error.message };
  }
  return {
    status: "error",
    scope: "form",
    message: "Something went wrong that this screen does not have a name for.",
  };
}
