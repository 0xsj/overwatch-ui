import type { MemoryRoute } from "@/lib/http";
import type { ShellContext } from "@/lib/services/shell";

/** The mock's shape with the mock's names replaced: `31m` is the tenant, and
 *  `Halcyon` is the client whose engagement is open — which is why the external
 *  Client invitation in `auth.ts` goes to an address at the client's own domain
 *  and the Analyst's does not. */
const CONTEXT: ShellContext = {
  account: { id: "acct_01JQ8H", name: "S. Jarratt", email: "sj@31m.example" },
  org: { id: "org_01JQ8H", name: "31m" },
  target: {
    id: "tgt_01JQ8H",
    name: "Halcyon",
    kind: "engagement",
    ends_at: "30 September 2026",
  },
};

export const shellRoutes: MemoryRoute[] = [
  (req) => {
    if (!(req.method === "GET" && req.path === "/me/context")) return undefined;
    return CONTEXT;
  },
];
