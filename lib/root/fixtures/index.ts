import type { MemoryRoute } from "@/lib/http";
import { accessRoutes } from "./access";
import { entityRoutes } from "./entities";
import { identityRoutes } from "./identity";
import { ledgerRoutes } from "./ledger";
import { tenancyRoutes } from "./tenancy";

/** Every fixture route, in the order they are tried. One array so a route that
 *  exists cannot be unreachable because somebody forgot to register it. */
export const routes: MemoryRoute[] = [
  ...identityRoutes,
  ...tenancyRoutes,
  ...ledgerRoutes,
  ...accessRoutes,
  ...entityRoutes,
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
