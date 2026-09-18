"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button } from "@/components/forms";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../_hooks";
import { Text } from "@/components/typography";
import type { Target } from "@/lib/services/targets";
import { archiveTargetAction, reopenTargetAction } from "../_actions";
import s from "../../surface/surface.module.css";

/** One target, and the two acts that need admin rather than write.
 *
 *  Archiving HIDES a record and keeps it — every run, observation and
 *  attribution names it — which is nearer "edit scope" than to the ordinary
 *  work of an engagement, and `0029` puts it at that rung for exactly that
 *  reason. The actions existed here for a day with no control rendering them,
 *  which is the state `CLAUDE.md` rule 5 forbids. */
export function TargetRow({
  workspaceId,
  target,
  mayAdmin,
}: {
  workspaceId: string;
  target: Target;
  mayAdmin: boolean;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  const act = (run: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = (await afterWrite(run, [keys.targets.all(workspaceId)])) as { status: string; message?: string };
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
    });

  return (
    <tr>
      <td className={s.value}>{target.name}</td>
      <td><Badge mono>{target.kind}</Badge></td>
      <td className={s.quiet}>{target.created_at}</td>
      <td>
        <Link href={`/surface/scope?target=${encodeURIComponent(target.target_id)}`}>
          rules →
        </Link>
      </td>
      <td>
        {mayAdmin ? (
          <Button
            size="sm"
            intent="ghost"
            disabled={pending}
            onClick={() =>
              act(() =>
                target.archived
                  ? reopenTargetAction(workspaceId, target.target_id)
                  : archiveTargetAction(workspaceId, target.target_id),
              )
            }
          >
            {target.archived ? "Reopen" : "Archive"}
          </Button>
        ) : null}
        {refusal ? <Text size="xs" tone="tertiary">{refusal}</Text> : null}
      </td>
    </tr>
  );
}
