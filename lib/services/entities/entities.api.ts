import type { HttpClient } from "@/lib/http";
import type { EntityGraph, EntityRef, Pin } from "./entities.types";

export type GraphQuery = { limit?: number; signal?: AbortSignal };

export function listEntities(http: HttpClient, signal?: AbortSignal): Promise<EntityRef[]> {
  return http.get<EntityRef[]>("/entities", { signal });
}

export function getGraph(
  http: HttpClient,
  rootId: string,
  { limit, signal }: GraphQuery = {},
): Promise<EntityGraph> {
  return http.get<EntityGraph>(`/entities/${encodeURIComponent(rootId)}/graph`, {
    params: { limit },
    signal,
  });
}

export function getPins(http: HttpClient, rootId: string, signal?: AbortSignal): Promise<Pin[]> {
  return http.get<Pin[]>(`/entities/${encodeURIComponent(rootId)}/pins`, { signal });
}

export function putPin(
  http: HttpClient,
  rootId: string,
  nodeId: string,
  at: { x: number; y: number },
): Promise<Pin> {
  return http.put<Pin>(
    `/entities/${encodeURIComponent(rootId)}/pins/${encodeURIComponent(nodeId)}`,
    { body: at },
  );
}

export function unpin(http: HttpClient, rootId: string, nodeId: string): Promise<void> {
  return http.delete<void>(
    `/entities/${encodeURIComponent(rootId)}/pins/${encodeURIComponent(nodeId)}`,
  );
}

/** "Re-layout" — drops every pin on this canvas and lets the layout place
 *  everything again. */
export function clearPins(http: HttpClient, rootId: string): Promise<void> {
  return http.delete<void>(`/entities/${encodeURIComponent(rootId)}/pins`);
}
