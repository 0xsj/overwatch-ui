import type { HttpClient } from "@/lib/http";
import type { Mapping, MappingInput, Tool, ToolInput } from "./tooling.types";

/** REAL. Under `/orgs` and never under a workspace — `decisions/0031`: a tool is
 *  what the FIRM can do, and the same definition serves every client. Putting it
 *  under a workspace would mean one firm re-typing its own tools per engagement.
 *
 *  The gate is the org role, which is wider than any engagement gate, and that
 *  is stated rather than assumed: `scope` refuses the spawn independently. */
const org = (id: string) => `/orgs/${encodeURIComponent(id)}`;

/** `archived` INCLUDES the archived ones — it does not select them. The server
 *  reads the parameter as a boolean flag on one query, so there is no "only
 *  archived" read and a screen wanting that section filters the full list. */
export function listTools(
  http: HttpClient,
  orgId: string,
  options?: { archived?: boolean; signal?: AbortSignal },
): Promise<Tool[]> {
  return http.get<Tool[]>(`${org(orgId)}/tools`, {
    params: { archived: options?.archived ? 1 : undefined },
    signal: options?.signal,
  });
}

export function addTool(http: HttpClient, orgId: string, input: ToolInput): Promise<Tool> {
  return http.post<Tool>(`${org(orgId)}/tools`, { body: input });
}

export function updateTool(
  http: HttpClient,
  orgId: string,
  toolId: string,
  input: Omit<ToolInput, "name">,
): Promise<Tool> {
  return http.patch<Tool>(`${org(orgId)}/tools/${encodeURIComponent(toolId)}`, { body: input });
}

/** Archive, not delete — 204. **409 when a live check still runs it, and the
 *  message NAMES the checks**: `this tool is still used by web surface`. Render
 *  the names; the fix is the user's, and "cannot archive" with no reason is a
 *  dead end. */
export function archiveTool(http: HttpClient, orgId: string, toolId: string): Promise<void> {
  return http.delete<void>(`${org(orgId)}/tools/${encodeURIComponent(toolId)}`);
}

export function listMappings(http: HttpClient, orgId: string, toolId: string): Promise<Mapping[]> {
  return http.get<Mapping[]>(`${org(orgId)}/tools/${encodeURIComponent(toolId)}/mappings`);
}

export function addMapping(
  http: HttpClient,
  orgId: string,
  toolId: string,
  input: MappingInput,
): Promise<Mapping> {
  return http.post<Mapping>(`${org(orgId)}/tools/${encodeURIComponent(toolId)}/mappings`, {
    body: input,
  });
}

export function promoteMapping(
  http: HttpClient,
  orgId: string,
  toolId: string,
  mappingId: string,
): Promise<Mapping> {
  return http.post<Mapping>(
    `${org(orgId)}/tools/${encodeURIComponent(toolId)}/mappings/${encodeURIComponent(mappingId)}/promote`,
  );
}
