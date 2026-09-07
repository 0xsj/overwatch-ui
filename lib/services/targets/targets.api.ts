import type { HttpClient } from "@/lib/http";
import type { Rule, RuleInput, Target, TargetInput } from "./targets.types";

/** REAL — `internal/target` and `internal/scope`. Under `/workspaces`, and the
 *  target is NEVER resolved without the engagement: a target in another one
 *  answers the same 404 as one that does not exist, because the caller must not
 *  learn which. */
const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;
const at = (workspace: string, target: string) =>
  `${ws(workspace)}/targets/${encodeURIComponent(target)}`;

/** `archived` includes closed ones, which is what makes one reachable and
 *  therefore reopenable. Omitted, the list is the live ones. */
export function listTargets(
  http: HttpClient,
  workspaceId: string,
  options?: { archived?: boolean; signal?: AbortSignal },
): Promise<Target[]> {
  return http.get<Target[]>(`${ws(workspaceId)}/targets`, {
    params: { archived: options?.archived ? 1 : undefined },
    signal: options?.signal,
  });
}

/** 201. The gate is `write` — adding something to look at is the ordinary work
 *  of an engagement. */
export function addTarget(
  http: HttpClient,
  workspaceId: string,
  input: TargetInput,
): Promise<Target> {
  return http.post<Target>(`${ws(workspaceId)}/targets`, { body: input });
}

export function renameTarget(
  http: HttpClient,
  workspaceId: string,
  targetId: string,
  name: string,
): Promise<Target> {
  return http.patch<Target>(at(workspaceId, targetId), { body: { name } });
}

/** ADMIN, not write — `0029`. It hides a record, which is nearer "edit scope"
 *  than to the ordinary work of an engagement. 204. */
export function archiveTarget(
  http: HttpClient,
  workspaceId: string,
  targetId: string,
): Promise<void> {
  return http.delete<void>(at(workspaceId, targetId));
}

export function reopenTarget(
  http: HttpClient,
  workspaceId: string,
  targetId: string,
): Promise<Target> {
  return http.post<Target>(`${at(workspaceId, targetId)}/reopen`);
}

/** A RECORD read — `read` is enough and a CLOSED engagement still answers.
 *
 *  `all` brings back superseded rules, which is the history an invocation's
 *  refusal cites. A lineage screen wants them; a scope editor does not. */
export function listRules(
  http: HttpClient,
  workspaceId: string,
  targetId: string,
  options?: { all?: boolean; signal?: AbortSignal },
): Promise<Rule[]> {
  return http.get<Rule[]>(`${at(workspaceId, targetId)}/scope`, {
    params: { all: options?.all ? 1 : undefined },
    signal: options?.signal,
  });
}

/** ADMIN — `0019` puts "edit scope" at that rung in as many words. 201. */
export function addRule(
  http: HttpClient,
  workspaceId: string,
  targetId: string,
  input: RuleInput,
): Promise<Rule> {
  return http.post<Rule>(`${at(workspaceId, targetId)}/scope`, { body: input });
}

/** DELETE at the wire and a SUPERSEDE underneath — `decisions/0030`. There is no
 *  edit, the row keeps its id forever, and an invocation refusal and a finding's
 *  scope proof both still resolve it afterwards. 204. */
export function supersedeRule(
  http: HttpClient,
  workspaceId: string,
  targetId: string,
  ruleId: string,
): Promise<void> {
  return http.delete<void>(`${at(workspaceId, targetId)}/scope/${encodeURIComponent(ruleId)}`);
}
