import type { HttpClient } from "@/lib/http";
import type { ShellContext } from "./shell.types";

/** One read, because the chrome cannot render half of itself. The path is a
 *  proposal — no endpoint serves it yet. */
export function getShellContext(http: HttpClient, options?: { signal?: AbortSignal }): Promise<ShellContext> {
  return http.get<ShellContext>("/me/context", { signal: options?.signal });
}
