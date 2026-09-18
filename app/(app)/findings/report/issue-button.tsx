"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../_hooks";
import { issueReportAction } from "../_actions";

/** Issuing freezes bytes, and it is **not undoable** — so the control says that
 *  rather than discovering it afterwards. */
export function IssueButton({
  workspaceId,
  reportId,
  revisions,
}: {
  workspaceId: string;
  reportId: string;
  revisions: number;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [issued, setIssued] = useState(false);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  return (
    <Alert tone={issued ? "accent" : "info"}>
      <Text size="sm">
        {issued ? (
          <>Issued. Those bytes are frozen and addressable by their hash.</>
        ) : (
          <>
            <strong>Issuing freezes what the preview shows.</strong> It cannot be
            undone — a revision is bytes somebody may already hold.{" "}
            {revisions > 0 ? `${revisions} already issued.` : "None issued yet."}
          </>
        )}
      </Text>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setRefusal(null);
            const result = (await afterWrite(
              () => issueReportAction(workspaceId, reportId),
              [keys.reports.all(workspaceId)],
            )) as { status: string; message?: string };
            if (result.status === "error") setRefusal(result.message ?? "That was refused.");
            else setIssued(true);
          })
        }
      >
        {pending ? "Issuing" : "Issue a revision"}
      </Button>
      {refusal ? <Text size="xs" tone="tertiary">{refusal}</Text> : null}
    </Alert>
  );
}
