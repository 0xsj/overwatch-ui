"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/forms";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../_hooks";
import { Text } from "@/components/typography";
import { supersedeRuleAction } from "../_actions";

/** "Delete" is a supersede, and the word matters enough to say on the control.
 *
 *  `decisions/0030`: a rule is never edited and never removed, because an
 *  invocation's refusal and a finding's scope proof both cite it by id. This
 *  stops it applying and keeps the row, so a citation made at the time still
 *  resolves — which is the whole reason the ledger is append-only. */
export function SupersedeButton({
  workspaceId,
  targetId,
  ruleId,
}: {
  workspaceId: string;
  targetId: string;
  ruleId: string;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  return (
    <>
      <Button
        size="sm"
        intent="ghost"
        disabled={pending}
        title="Stops it applying and keeps the row — every refusal that cited it still resolves."
        onClick={() =>
          start(async () => {
            const result = (await afterWrite(() => supersedeRuleAction(workspaceId, targetId, ruleId), [keys.targets.all(workspaceId)])) as { status: string; message?: string };
            if (result.status === "error")
              setRefusal("message" in result ? (result.message ?? "That was refused.") : "That was refused.");
          })
        }
      >
        {pending ? "Superseding" : "Supersede"}
      </Button>
      {refusal ? <Text size="xs" tone="tertiary">{refusal}</Text> : null}
    </>
  );
}
