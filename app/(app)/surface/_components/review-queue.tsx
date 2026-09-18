"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button, Input } from "@/components/forms";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../_hooks";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import type { Attribution, Fragment } from "@/lib/services/entities";
import { decideAction } from "../_actions";
import s from "../surface.module.css";

/** The queue `decideAttribution` was built for, and had no screen.
 *
 *  ADMIN rather than write: accepting a claim puts something on a client's asset
 *  list, which is nearer editing scope than the ordinary work of an engagement.
 *  Rejecting KEEPS the row — a rejected claim is what stops the same proposal
 *  arriving again, so it is a decision rather than a deletion. */
export function ReviewQueue({
  workspaceId,
  rows,
}: {
  workspaceId: string;
  rows: { fragment: Fragment; edge: Attribution; root: string }[];
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  const decide = (id: string, state: "accepted" | "rejected") =>
    start(async () => {
      setRefusal(null);
      setBusy(id);
      const result = (await afterWrite(() => decideAction(workspaceId, id, state, note || undefined), [keys.entities.all(workspaceId)])) as { status: string; message?: string };
      setBusy(null);
      if (result.status === "error")
        setRefusal("message" in result ? (result.message ?? "That was refused.") : "That was refused.");
    });

  return (
    <>
      {refusal ? <Alert tone="warn"><Text size="sm">{refusal}</Text></Alert> : null}

      <div className={s.rows}>
        {rows.map(({ fragment, edge, root }) => (
          <div key={edge.attribution_id} className={s.step}>
            <span className={s.drawerRow}>
              <Badge mono>{fragment.kind}</Badge>
              <span className={s.value}>{fragment.value}</span>
              <Text size="xs" tone="quiet">belongs to {root}?</Text>
              <Badge mono>{edge.claimant}</Badge>
              {/* ONLY A MODEL carries one. A rule's assignment is a category and
                  a person's is a decision; a float beside either would read as
                  the same kind of thing. */}
              {edge.confidence === undefined ? (
                <span className={s.quiet}>no confidence — not a model</span>
              ) : (
                <Badge tone="warn" mono>{edge.confidence.toFixed(2)}</Badge>
              )}
            </span>

            <Text size="sm" tone="secondary">{edge.basis}</Text>

            <div className={s.actions}>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => decide(edge.attribution_id, "accepted")}
              >
                {busy === edge.attribution_id ? "Deciding" : "Accept"}
              </Button>
              <Button
                size="sm"
                intent="ghost"
                disabled={pending}
                onClick={() => decide(edge.attribution_id, "rejected")}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className={s.reason}>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="a note on the decision (optional)"
        />
        <Text size="xs" tone="tertiary">
          Kept beside the decision, not instead of the basis. The claimant&rsquo;s
          reason for proposing it and your reason for ruling are two different
          sentences.
        </Text>
      </div>
    </>
  );
}
