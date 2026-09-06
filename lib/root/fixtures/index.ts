import type { MemoryRoute } from "@/lib/http";
import { authRoutes } from "./auth";

/** Every fixture route, in the order they are tried. One array so a route that
 *  exists cannot be unreachable because somebody forgot to register it. */
export const routes: MemoryRoute[] = [...authRoutes];
