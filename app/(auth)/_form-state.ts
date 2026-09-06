import type { Failure } from "@/lib/auth";

/** The shape a form's action returns, and its starting value.
 *
 *  This lives OUTSIDE `_actions.ts` because that file carries "use server", and a
 *  "use server" module may export async functions and nothing else — a constant
 *  there fails at request time with "can only export async functions, found
 *  object", long after the build has passed. */
export type FormState =
  | { status: "idle" }
  | { status: "ok" }
  | ({ status: "error" } & Omit<Failure, "ok">);

export const initialFormState: FormState = { status: "idle" };
