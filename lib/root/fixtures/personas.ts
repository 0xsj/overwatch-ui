import type { Grant, Invite } from "@/lib/services/access";
import type { Me, Member } from "@/lib/services/tenancy";

/** The two tenants a fixture run can be.
 *
 *  One tenant could only ever show one of the two products this is. A solo
 *  hunter's org has one member and a `Personal` workspace and never thinks about
 *  membership; a firm's has five roles, four engagements and a wall between
 *  them, and every screen about access is dead weight in the first and the whole
 *  purchase in the second. Holding both means the empty state and the full one
 *  are each reachable rather than described.
 *
 *  Both are shaped exactly as the live server answers — walked on 2026-09-07:
 *  a personal org is named after the person, its first workspace is `Personal`,
 *  and the owner reads `access: "admin"` on it with no grant row written. */
export type PersonaName = "hunter" | "firm";

export type Persona = {
  label: string;
  blurb: string;
  me: Me;
  members: Member[];
  grants: Grant[];
  invites: Invite[];
};

const HUNTER_ORG = "01a07b46-fa36-7001-a0b5-000000000001";
const FIRM_ORG = "01a07b46-fa36-7001-a0b5-000000000002";

const ws = (n: number) => `01a07b46-fa56-7001-9bd7-00000000000${n}`;
const acct = (n: number) => `01a07b46-fa1c-7000-a870-00000000000${n}`;

/* ─── hunter ───────────────────────────────────────────────────────────────
   What `POST /v1/accounts` produces, plus one engagement the person opened for
   themselves. Nobody else is in it, there are no grants — the owner is exempt —
   and every collaboration screen is correctly empty rather than broken.      */

const hunter: Persona = {
  label: "Solo hunter",
  blurb:
    "One person, their own org, and the engagements they opened for themselves. Every access screen is a one-row list, and that is a correct state rather than an empty one.",
  me: {
    account_id: acct(1),
    email: "rowan@vale.example",
    status: "active",
    verified: true,
    orgs: [
      {
        org_id: HUNTER_ORG,
        name: "Rowan Vale",
        role: "owner",
        workspaces: [
          { workspace_id: ws(1), name: "Personal", access: "admin" },
          { workspace_id: ws(2), name: "CTF1", access: "admin" },
        ],
      },
    ],
  },
  members: [
    {
      account_id: acct(1),
      email: "rowan@vale.example",
      name: "Rowan Vale",
      role: "owner",
      status: "active",
      joined_at: "2026-08-18T09:20:38Z",
    },
  ],
  grants: [],
  invites: [],
};

/* ─── firm ─────────────────────────────────────────────────────────────────
   31m is the tenant and Halcyon is the client whose engagement is open, which
   is why the `client` member's address is at the client's own domain and the
   analyst's is not.

   The two rows worth reading twice are Priya and Tom. Priya is an `admin` —
   she manages people — and she holds `read` on Halcyon and nothing on
   Northbeam, because `0019` says promoting somebody to handle invitations must
   not hand them every client's wall. Tom is a plain `member` with `write` on
   Halcyon and no row for Northbeam at all, so Northbeam is ABSENT from his
   `/v1/me` rather than present at `none`.                                   */

const firm: Persona = {
  label: "Firm",
  blurb:
    "A consultancy with five roles and a wall between engagements. An admin manages people and is granted an engagement like anybody else; a member with no grant cannot see that an engagement exists.",
  me: {
    account_id: acct(2),
    email: "sj@31m.example",
    status: "active",
    verified: true,
    orgs: [
      {
        org_id: FIRM_ORG,
        name: "31m",
        role: "owner",
        // The owner is the one exemption: admin on every workspace in the org
        // with no grant written. Which is why this list is all four.
        workspaces: [
          { workspace_id: ws(3), name: "Halcyon", access: "admin" },
          { workspace_id: ws(4), name: "Northbeam", access: "admin" },
          { workspace_id: ws(5), name: "Q3 Retainer", access: "admin" },
          { workspace_id: ws(6), name: "Internal", access: "admin" },
        ],
      },
    ],
  },
  members: [
    {
      account_id: acct(2),
      email: "sj@31m.example",
      name: "S. Jarratt",
      role: "owner",
      status: "active",
      joined_at: "2026-08-18T09:20:38Z",
    },
    {
      account_id: acct(3),
      email: "priya@31m.example",
      name: "Priya Raman",
      role: "admin",
      status: "active",
      joined_at: "2026-08-24T14:02:11Z",
    },
    {
      account_id: acct(4),
      email: "tom@31m.example",
      name: "Tom Adeyemi",
      role: "member",
      status: "active",
      joined_at: "2026-09-01T08:41:57Z",
    },
    {
      account_id: acct(5),
      email: "mara.okafor@contract.example",
      name: "Mara Okafor",
      role: "guest",
      status: "active",
      joined_at: "2026-09-03T11:15:02Z",
    },
    {
      account_id: acct(6),
      email: "f.osei@halcyon.example",
      name: "Femi Osei",
      role: "client",
      status: "active",
      joined_at: "2026-09-04T16:30:44Z",
    },
  ],
  grants: [
    { account_id: acct(3), workspace_id: ws(3), level: "read" },
    { account_id: acct(3), workspace_id: ws(6), level: "admin" },
    { account_id: acct(4), workspace_id: ws(3), level: "write" },
    { account_id: acct(4), workspace_id: ws(5), level: "write" },
    { account_id: acct(5), workspace_id: ws(4), level: "read" },
    { account_id: acct(6), workspace_id: ws(3), level: "read" },
  ],
  invites: [
    {
      id: "inv_01JQ8H",
      token: "inv_01JQ8H",
      email: "k.mensah@31m.example",
      role: "member",
      org_id: FIRM_ORG,
      org_name: "31m",
      invited_by: "sj@31m.example",
      first_grant: { workspace_id: ws(4), workspace_name: "Northbeam", level: "read" },
      expires_at: "2026-09-14T09:00:00Z",
      state: "pending",
    },
  ],
};

export const PERSONAS: Record<PersonaName, Persona> = { hunter, firm };

export const PERSONA_NAMES = Object.keys(PERSONAS) as PersonaName[];

export const DEFAULT_PERSONA: PersonaName = "firm";

/** Which persona a bearer token names, or `null` for one that names none.
 *
 *  STRICT, and it was not until 2026-09-07: it fell back to `firm` for anything
 *  unrecognised, and the consequence was visible immediately. Signed in for real
 *  against the live server, the members screen showed the firm's fixture
 *  invitations under a real account's own org — because `access` is always
 *  fixtures and every real bearer resolved to the same imaginary tenant.
 *
 *  Nothing was disclosed, since both tenants are invented. The shape was still
 *  wrong in exactly the way §Scope cares about, and a default that answers for
 *  a caller it does not recognise is how that shape gets built. */
export function personaFromToken(token: string | null | undefined): PersonaName | null {
  const raw = String(token ?? "");
  if (!raw.startsWith("fixture_")) return null;
  const name = raw.slice("fixture_".length);
  return isPersona(name) ? name : null;
}

export function personaOf(email: string): PersonaName | undefined {
  return PERSONA_NAMES.find((n) => PERSONAS[n].me.email === email.trim().toLowerCase());
}

export function isPersona(value: string): value is PersonaName {
  return (PERSONA_NAMES as string[]).includes(value);
}
