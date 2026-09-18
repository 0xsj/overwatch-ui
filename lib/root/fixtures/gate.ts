import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRoute } from "@/lib/http";
import { PERSONAS, personaFromToken } from "./personas";

/** The `client` wall, reproduced — `decisions/0042`.
 *
 *  **404 and never 403.** A client learning that an invocation log exists is a
 *  client learning what was run against them, so the refusal must be
 *  indistinguishable from the route not existing.
 *
 *  It sits FIRST in the route list and is FAIL-CLOSED, which is the half worth
 *  copying: the server's gate refuses every workspace route and only the report
 *  ones opt in, so a route added tomorrow excludes clients without anybody
 *  remembering to think about it. A fixture that listed what a client CANNOT
 *  reach would drift the first time somebody added a route and forgot.
 *
 *  Reproduced here rather than left permissive because a fixture that is looser
 *  than the server is the direction that hurts: a screen built against it works
 *  until it meets the real thing. The observations filter learned that on
 *  2026-09-07 and this is the same lesson, at the level of a whole role. */
const ALLOWED = [
  /^\/workspaces\/[^/]+\/reports(\/|$)/,
  /^\/workspaces\/[^/]+\/revisions\/[^/]+$/,
];

export const clientGate: MemoryRoute = (req) => {
  const name = personaFromToken(bearerOf(req));
  if (!name) return undefined;
  // The role is read off the persona's ONE org, which is all a fixture has.
  if (PERSONAS[name].me.orgs[0]?.role !== "client") return undefined;

  // Only workspace routes are gated. `/v1/me` and the org reads answer, because
  // a client is a member of the org and has to be able to boot.
  if (!req.path.startsWith("/workspaces/")) return undefined;
  if (ALLOWED.some((allowed) => allowed.test(req.path))) return undefined;

  throw new AppError({ kind: "not_found", message: "not found", status: 404 });
};
