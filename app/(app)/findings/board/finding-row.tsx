"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Finding, Severity } from "@/lib/services/findings";
import { useAfterWrite } from "../../_hooks";
import { decideFindingAction, reassessFindingAction } from "../_actions";
import s from "../../surface/surface.module.css";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

/** One finding, and the two writes that are arguments rather than edits. */
export function FindingRow({
  workspaceId,
  finding,
}: {
  workspaceId: string;
  finding: Finding;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [basis, setBasis] = useState("");
  const [severity, setSeverity] = useState<Severity>(finding.severity);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  const act = (run: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = (await afterWrite(run, [keys.findings.all(workspaceId)])) as {
        status: string;
        message?: string;
      };
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
    });

  const live = finding.state === "open" || finding.state === "triaged";

  return (
    <div className={s.step} data-state={finding.severity}>
      <span className={s.drawerRow}>
        <Badge tone={finding.severity === "critical" || finding.severity === "high" ? "warn" : "neutral"} mono>
          {finding.severity}
        </Badge>
        <span className={s.value}>{finding.signature}</span>
        <Badge mono>{finding.fragment_kind}</Badge>
        <span className={s.mono}>{finding.fragment_value}</span>
        <Badge tone="neutral" mono>{finding.state}</Badge>
      </span>

      <Text size="xs" tone="quiet">
        {/* The history one row carries instead of one row per scan — and with
            no `regressed` state, an old first-seen beside a large count is the
            only evidence a reader has that a fix did not hold. */}
        seen {finding.sightings}×, first {finding.first_seen.slice(0, 10)}, last{" "}
        {finding.last_seen.slice(0, 10)}
      </Text>

      <Text size="xs" tone="tertiary">
        {/* `0004` on the wire. Only a model carries a confidence — a template
            asserting `high` is a category, not a probability. */}
        {finding.severity} by {finding.severity_by.claimant}
        {finding.severity_by.confidence !== undefined
          ? ` · ${finding.severity_by.confidence.toFixed(2)}`
          : " · no confidence — not a model"}
        {finding.severity_by.basis ? ` — ${finding.severity_by.basis}` : ""}
      </Text>

      {/* The correction IS the signal, so a superseded assessment renders
          rather than being replaced silently. */}
      {finding.severity_by.superseded ? (
        <Text size="xs" tone="tertiary">
          was <strong>{finding.severity_by.superseded.severity}</strong> by{" "}
          {finding.severity_by.superseded.claimant}
          {finding.severity_by.superseded.basis
            ? ` — ${finding.severity_by.superseded.basis}`
            : ""}
        </Text>
      ) : null}

      {finding.reason ? (
        <Text size="xs" tone="tertiary">
          {finding.state === "dismissed" ? "dismissed" : "resolved"}: {finding.reason}
        </Text>
      ) : null}

      {refusal ? <Text size="xs" tone="tertiary">{refusal}</Text> : null}

      <div className={s.actions}>
        <Button size="sm" intent="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Decide"}
        </Button>
      </div>

      {open ? (
        <div className={s.reason}>
          {live ? (
            <>
              <div className={s.actions}>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => act(() => decideFindingAction(workspaceId, finding.finding_id, "triaged"))}
                >
                  Triaged — it is real
                </Button>
                {/* A fix needs no argument: the thing is gone. */}
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => act(() => decideFindingAction(workspaceId, finding.finding_id, "resolved", reason || undefined))}
                >
                  Fixed
                </Button>
                {/* A dismissal without a reason reads as "never looked at" in
                    six months, which is why the server refuses one. */}
                <Button
                  size="sm"
                  intent="ghost"
                  disabled={pending || reason.trim() === ""}
                  onClick={() => act(() => decideFindingAction(workspaceId, finding.finding_id, "dismissed", reason))}
                >
                  Does not matter
                </Button>
              </div>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="why — required to dismiss, optional to mark fixed"
              />
              <Text size="xs" tone="tertiary">
                There is no way back to <code>open</code>. A finding reopens by
                being <strong>seen again</strong>, which is a fact about the
                estate rather than an opinion.
              </Text>
            </>
          ) : (
            <Text size="xs" tone="tertiary">
              Already decided. It reopens only by being seen again.
            </Text>
          )}

          <div className={s.actions}>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger className={s.target}><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((sv) => <SelectItem key={sv} value={sv}>{sv}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              intent="ghost"
              disabled={pending || basis.trim() === "" || severity === finding.severity}
              onClick={() => act(() => reassessFindingAction(workspaceId, finding.finding_id, severity, basis))}
            >
              Reassess
            </Button>
          </div>
          <Input
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            placeholder="why this severity is wrong — required"
          />
          <Text size="xs" tone="tertiary">
            Overriding somebody else&rsquo;s assessment is a disagreement. One
            with no stated reason records that somebody disagreed without saying
            why they were right — so the prior claim is kept and shown beside
            yours.
          </Text>
        </div>
      ) : null}
    </div>
  );
}
