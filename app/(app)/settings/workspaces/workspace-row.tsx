"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button, Input } from "@/components/forms";
import { Text } from "@/components/typography";
import type { OrgWorkspace } from "@/lib/services/tenancy";
import { closeWorkspaceAction, renameWorkspaceAction, reopenWorkspaceAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import s from "../settings.module.css";

/** Closing is not deleting, and the controls say so.
 *
 *  A closed engagement is READABLE and not WORKABLE — its record, its audit log
 *  and who was on it all survive, and the grants survive with them, which is
 *  what makes the trail readable by the people who made it rather than only by
 *  the org owner.
 *
 *  Acting in one answers 409 rather than 404, and this row renders that message
 *  rather than disabling anything. The caller can see the engagement and already
 *  knows it exists, so the useful answer is the reason. */
export function WorkspaceRow({ workspace }: { workspace: OrgWorkspace }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mayAct = workspace.access === "admin";

  const run = (act: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = await act();
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
      else setRenaming(false);
    });

  return (
    <div className={s.wsRow}>
      <div className={s.who}>
        {renaming ? (
          <form
            className={s.rowControls}
            action={(data) => run(() => renameWorkspaceAction(workspace.workspace_id, initialFormState, data))}
          >
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" size="sm" loading={pending}>Save</Button>
            <Button type="button" size="sm" intent="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <span className={s.name}>{workspace.name}</span>
        )}
        {refusal ? <Text size="xs" tone="accent" role="alert">{refusal}</Text> : null}
      </div>

      <Badge tone="neutral" mono>{workspace.access}</Badge>
      {workspace.closed ? <Badge tone="warn" mono>closed</Badge> : null}

      {mayAct ? (
        <div className={s.rowControls}>
          {workspace.closed ? (
            /* Reopening can fail on the NAME rather than on this engagement:
               closing frees it, so another may hold it now. The server's message
               says which, and it is rendered rather than replaced. */
            <>
              {/* The record is what closing preserves, so it is one click from
                  here. `?workspace=` is the only way to reach a closed
                  engagement's log — the chrome's workspace is always a live
                  one. */}
              <Button size="sm" intent="ghost" asChild>
                <Link href={`/home/audit-log?workspace=${workspace.workspace_id}`}>
                  Read its record
                </Link>
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run(() => reopenWorkspaceAction(workspace.workspace_id))}
              >
                Reopen
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" intent="ghost" disabled={pending} onClick={() => setRenaming(true)}>
                Rename
              </Button>
              <Button
                size="sm"
                intent="ghost"
                disabled={pending}
                onClick={() => run(() => closeWorkspaceAction(workspace.workspace_id))}
              >
                Close
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
