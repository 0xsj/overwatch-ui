import type { MemoryRoute } from "@/lib/http";
import { accessRoutes } from "./access";
import { clientGate } from "./gate";
import { entityRoutes, graphRoutes } from "./entities";
import { identityRoutes } from "./identity";
import { ledgerRoutes } from "./ledger";
import { workRoutes } from "./work";
import { researchRoutes } from "./research";
import { tenancyRoutes } from "./tenancy";

/** Every fixture route, in the order they are tried. One array so a route that
 *  exists cannot be unreachable because somebody forgot to register it. */
export const routes: MemoryRoute[] = [
  /* FIRST, and fail-closed. A `client` reaches the report routes and nothing
     else; everything below never sees the request. */
  clientGate,
  ...identityRoutes,
  ...tenancyRoutes,
  ...ledgerRoutes,
  ...accessRoutes,
  ...researchRoutes,
  ...workRoutes,
  ...entityRoutes,
  ...graphRoutes,
];

export { FIXTURE_PASSWORD, pendingLinks } from "./identity";
export {
  DEFAULT_PERSONA,
  PERSONAS,
  PERSONA_NAMES,
  isPersona,
  personaFromToken,
  type Persona,
  type PersonaName,
} from "./personas";
