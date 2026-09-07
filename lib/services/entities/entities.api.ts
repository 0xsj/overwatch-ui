import type { HttpClient } from "@/lib/http";
import type {
  Asset, Attribution, Canvas, ClaimState, Entity, Fragment, FragmentDetail,
  JudgementState,
} from "./entities.types";

/** REAL — `internal/entity`, `decisions/0036`. Under `/workspaces`: a claim
 *  about what is whose is a claim about a client. */
const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

/** The VIEW — `0009` asked for the word and the query to be the same object.
 *
 *  Two conditions the browser cannot evaluate: an ACCEPTED attribution to the
 *  TARGET'S ROOT entity, and a targetable kind. Fetching `/fragments` and
 *  filtering here would be a third implementation of "is this an asset", and
 *  the one that goes stale. */
export function listAssets(
  http: HttpClient,
  workspaceId: string,
  options?: { target?: string; limit?: number; signal?: AbortSignal },
): Promise<Asset[]> {
  return http.get<Asset[]>(`${ws(workspaceId)}/assets`, {
    params: { target: options?.target, limit: options?.limit },
    signal: options?.signal,
  });
}

/** EVERYTHING observed, asset or not. A fragment nothing attributed is a real
 *  record of something a source said — it belongs on a screen, just not on the
 *  asset table. */
export function listFragments(
  http: HttpClient,
  workspaceId: string,
  options?: { kind?: string; limit?: number; signal?: AbortSignal },
): Promise<Fragment[]> {
  return http.get<Fragment[]>(`${ws(workspaceId)}/fragments`, {
    params: { kind: options?.kind, limit: options?.limit },
    signal: options?.signal,
  });
}

/** The drawer's header plus its WHY THIS IS ATTRIBUTED section — the claims,
 *  with who proposed each and whether anybody has agreed. */
export function readFragment(
  http: HttpClient,
  workspaceId: string,
  fragmentId: string,
  options?: { signal?: AbortSignal },
): Promise<FragmentDetail> {
  return http.get<FragmentDetail>(
    `${ws(workspaceId)}/fragments/${encodeURIComponent(fragmentId)}`,
    { signal: options?.signal },
  );
}

export function listEntities(
  http: HttpClient,
  workspaceId: string,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<Entity[]> {
  return http.get<Entity[]>(`${ws(workspaceId)}/entities`, {
    params: { limit: options?.limit },
    signal: options?.signal,
  });
}

/** The graph around one entity. `state` filters the attributions by claim
 *  state, which is how a review queue shows only what is `proposed`. */
export function readCanvas(
  http: HttpClient,
  workspaceId: string,
  entityId: string,
  options?: { state?: ClaimState; limit?: number; signal?: AbortSignal },
): Promise<Canvas> {
  return http.get<Canvas>(`${ws(workspaceId)}/entities/${encodeURIComponent(entityId)}`, {
    params: { state: options?.state, limit: options?.limit },
    signal: options?.signal,
  });
}

/** `write`. Recording that a person looked is ordinary work. */
export function judgeFragment(
  http: HttpClient,
  workspaceId: string,
  fragmentId: string,
  input: { state: JudgementState; reason?: string },
): Promise<Fragment> {
  return http.put<Fragment>(
    `${ws(workspaceId)}/fragments/${encodeURIComponent(fragmentId)}/judgement`,
    { body: input },
  );
}

export function judgeEntity(
  http: HttpClient,
  workspaceId: string,
  entityId: string,
  input: { state: JudgementState; reason?: string },
): Promise<Entity> {
  return http.put<Entity>(
    `${ws(workspaceId)}/entities/${encodeURIComponent(entityId)}/judgement`,
    { body: input },
  );
}

/** A person LOOKED, and it deliberately does not touch the judgement —
 *  `decisions/0037` §3. Two calls for two acts: somebody can read a thing and
 *  decline to rule on it, which is the commonest thing an analyst does. */
export function markRead(
  http: HttpClient,
  workspaceId: string,
  fragmentId: string,
): Promise<Fragment> {
  return http.put<Fragment>(
    `${ws(workspaceId)}/fragments/${encodeURIComponent(fragmentId)}/read`,
  );
}

/** ADMIN, not write: accepting a claim puts something on a client's asset list,
 *  which is nearer editing scope than ordinary work. It NEVER rewrites the
 *  claimant — `decisions/0008`'s title. */
export function decideAttribution(
  http: HttpClient,
  workspaceId: string,
  attributionId: string,
  input: { state: ClaimState; note?: string },
): Promise<Attribution> {
  return http.put<Attribution>(
    `${ws(workspaceId)}/attributions/${encodeURIComponent(attributionId)}`,
    { body: input },
  );
}
