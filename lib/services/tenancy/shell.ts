import type { Me, MeOrg, MeWorkspace, ShellContext } from "./tenancy.types";

/** The chrome, derived from the boot call rather than fetched.
 *
 *  This was `GET /me/context` — a proposed endpoint invented so the chrome could
 *  render itself in one read. `GET /v1/me` turned out to answer the same
 *  question and more, so the proposal is deleted rather than kept beside it. A
 *  second endpoint returning a subset of the first is two things to keep
 *  agreeing.
 *
 *  Returns `null` rather than throwing when there is nowhere to be. `orgs: []`
 *  is a legitimate state — registration is a chain, and for a few milliseconds
 *  after it the subscribers have not run — so the caller renders chrome with an
 *  empty switcher. An org with no VISIBLE workspace is the other case, and it
 *  is not transient: a member with no grant is meant to see nothing. */
export function selectShellContext(
  me: Me,
  wanted?: { org?: string; workspace?: string },
): ShellContext | null {
  const org = pick(me.orgs, wanted?.org, (o) => o.org_id);
  if (!org) return null;

  const workspace = pick(org.workspaces, wanted?.workspace, (w) => w.workspace_id);
  if (!workspace) return null;

  return {
    account: { id: me.account_id, email: me.email, verified: me.verified },
    org,
    workspace,
  };
}

/** Why an org resolved to no workspace, so a screen can say which. The two read
 *  identically from `orgs` and mean opposite things — `CLAUDE.md`'s
 *  `never checked vs found nothing` in its tenancy form. */
export function emptyReason(me: Me): "no-org" | "no-workspace" | null {
  if (me.orgs.length === 0) return "no-org";
  if (me.orgs.every((o) => o.workspaces.length === 0)) return "no-workspace";
  return null;
}

function pick<T>(items: T[], wanted: string | undefined, id: (item: T) => string): T | undefined {
  if (items.length === 0) return undefined;
  return (wanted && items.find((i) => id(i) === wanted)) || items[0];
}

export type { MeOrg, MeWorkspace };
