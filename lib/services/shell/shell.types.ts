export type Account = { id: string; name: string; email: string };

export type Org = { id: string; name: string };

/** `ends_at` is ABSENT when the engagement does not end, never null. An
 *  engagement with no end date and one whose end date nobody has set are
 *  different facts, and the chrome renders the second as a question rather than
 *  as "forever". */
export type Target = {
  id: string;
  name: string;
  kind: "engagement" | "programme" | "personal";
  ends_at?: string;
};

/** What the chrome needs before it can draw anything: who is signed in, whose
 *  tenant this is, and which target is open. */
export type ShellContext = { account: Account; org: Org; target: Target };
