"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/forms";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../../_hooks";
import { Text } from "@/components/typography";
import { archiveCheckAction } from "../_actions";

/** Archiving a check, and it keeps the row.
 *
 *  Every run that ever answered this question names it, so removing it would
 *  strand those records — the same argument that keeps a tool, a scope rule and
 *  a mapping version. What it stops is the clock: an archived check is not
 *  scheduled and is not a column on the coverage grid. */
export function ArchiveCheck({ orgId, checkId }: { orgId: string; checkId: string }) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  return (
    <>
      <Button
        size="sm"
        intent="ghost"
        disabled={pending}
        title="Keeps the record — every run that answered this question names it — and stops the clock."
        onClick={() =>
          start(async () => {
            const result = (await afterWrite(() => archiveCheckAction(orgId, checkId), [keys.checks.all(orgId)])) as { status: string; message?: string };
            if (result.status === "error")
              setRefusal("message" in result ? (result.message ?? "That was refused.") : "That was refused.");
          })
        }
      >
        {pending ? "Archiving" : "Archive"}
      </Button>
      {refusal ? <Text size="xs" tone="tertiary">{refusal}</Text> : null}
    </>
  );
}
