"use client";

import { usePathname } from "next/navigation";
import { researchWorkspaceFromPath, shellForPath } from "./_route-context";
import { useQuery, useQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { keys } from "@/lib/query";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { isAppError } from "@/lib/kernel";
import { investigationContextQuery, shellQuery } from "./_queries";
import type { Shell } from "./_shell";

/** The chrome's data, read from the cache rather than fetched again.
 *
 *  The layout seeds this key once on the server, so every screen that needs to
 *  know which engagement is open reads it for free. Without the seed each page
 *  would open with a request for the same answer the chrome already has, and
 *  the switcher would flicker on every navigation. */
export function useShell(): Shell | undefined {
  const shell = useQuery({ queryKey: keys.shell(), queryFn: shellQuery }).data;
  const pathname = usePathname();
  const workspace = researchWorkspaceFromPath(pathname);
  const known = shell?.me.orgs.some((org) => org.workspaces.some((one) => one.workspace_id === workspace));
  const record = useQuery({
    queryKey: keys.investigationContext(workspace ?? ""),
    queryFn: () => investigationContextQuery(workspace!),
    enabled: Boolean(workspace && shell && !known),
    staleTime: 30_000,
    retry: false,
  });
  return shell ? shellForPath(shell, pathname, record.data) : shell;
}

/** Where a screen is, in one object, because almost every query needs one of
 *  these two ids and half of them need both. */
export function useContext(): { org?: string; workspace?: string; shell?: Shell } {
  const shell = useShell();
  return {
    org: shell?.context?.org.org_id,
    workspace: shell?.context?.workspace.workspace_id,
    shell,
  };
}

/** The three states a read has, and they are three rather than two.
 *
 *  `pending` is *nobody has answered yet*. An error is *we asked and it did not
 *  work*. Data is the answer, and an EMPTY answer is a fourth thing the caller
 *  renders itself — because "no rows" is a fact about the engagement and this
 *  component knows nothing about which engagement it is.
 *
 *  It exists so that a failed read never renders as an empty one. That is the
 *  `never checked vs found nothing` pair, arriving in the client for the first
 *  time now that reads happen here: a server component that threw simply did
 *  not render, and a query that fails will happily render zero. */
export function Query<T>({
  of,
  children,
  pending,
  label,
}: {
  of: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  /** What to show while nobody has answered. Absent gives a quiet line rather
   *  than a spinner: most of these resolve in one paint against fixtures and a
   *  spinner that flashes is worse than a word. */
  pending?: React.ReactNode;
  /** Named in the failure, so "could not be read" says what could not. */
  label: string;
}) {
  if (of.isPending) {
    return pending !== undefined ? <>{pending}</> : (
      <Text size="sm" tone="quiet">Reading {label}…</Text>
    );
  }
  if (of.isError) {
    const appError = isAppError(of.error) ? of.error : undefined;
    return (
      <Alert tone="warn">
        <Text size="sm">
          <strong>Could not load {label}.</strong>
        </Text>
        <Text size="xs" tone="tertiary">
          {of.error instanceof Error ? of.error.message : String(of.error)}
        </Text>
        {appError?.retryable ? <Text size="xs" tone="tertiary">This may be temporary. Try again when the service is reachable.</Text> : null}
        {appError?.requestId ? <Text size="xs" tone="tertiary">Reference <code>{appError.requestId}</code></Text> : null}
        <Button type="button" size="sm" intent="ghost" onClick={() => void of.refetch()}>Try again</Button>
      </Alert>
    );
  }
  return <>{children(of.data)}</>;
}

/** The screen has no engagement open, which is a state rather than an error. */
export function NoWorkspace({ what }: { what: string }) {
  return (
    <Alert tone="info">
      <Text size="sm">
        No engagement open. {what} is a claim about a client, so it is kept
        inside one.
      </Text>
    </Alert>
  );
}

/** Run a write, then invalidate what it made stale.
 *
 *  **This is the seam a client-rendered app cannot do without, and the one it
 *  is easiest to ship broken.** Every action here still calls `revalidatePath`,
 *  which invalidates NEXT'S router cache — and that does nothing at all to data
 *  held in the query cache. The write lands, the server has the new row, and
 *  the screen goes on showing the old one until somebody reloads. It type-
 *  checks, it builds, and the only way to see it is to press the button.
 *
 *  The keys are PREFIXES, which is why they are hierarchical: passing
 *  `keys.tooling.all(org)` reaches that org's tool list and every tool's
 *  mappings in one call, because React Query matches by prefix. A caller names
 *  the domain it disturbed rather than enumerating queries it cannot see.
 *
 *  Invalidating everything would also work and is tempting. It is refused here
 *  for the same reason a screen does not re-fetch on every render: this API
 *  spawns processes, and a write to one engagement should not re-read another. */
export function useAfterWrite(): (
  run: () => Promise<unknown>,
  invalidate: readonly QueryKey[],
) => Promise<unknown> {
  const client = useQueryClient();
  return useCallback(
    async (run, invalidate) => {
      const result = await run();
      await Promise.all(
        invalidate.map((queryKey) => client.invalidateQueries({ queryKey })),
      );
      return result;
    },
    [client],
  );
}

/** The same invalidation, for a form.
 *
 *  `useActionState` has no success callback — the state turning `ok` is the
 *  only signal a form action gives — so this watches for that rather than
 *  wrapping the call. Six copies of the same effect is how one of them ends up
 *  invalidating the wrong key, which is a bug nothing can see. */
export function useInvalidateOnOk(
  state: { status: string },
  invalidate: readonly QueryKey[],
): void {
  const client = useQueryClient();
  const done = useRef(false);
  useEffect(() => {
    if (state.status !== "ok") { done.current = false; return; }
    if (done.current) return;
    done.current = true;
    for (const queryKey of invalidate) void client.invalidateQueries({ queryKey });
  }, [state, client, invalidate]);
}
