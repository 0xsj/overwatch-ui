"use client";

import { useState, useTransition } from "react";
import { Badge, Panel, Presence } from "@/components/display";
import { Button, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { absent, present } from "@/lib/kernel";
import type { Asset, Fragment, JudgementState } from "@/lib/services/entities";
import type { Target } from "@/lib/services/targets";
import { judgeAction, markReadAction } from "../_actions";
import { AssetDrawer } from "./asset-drawer";
import s from "../surface.module.css";

const JUDGEMENTS: JudgementState[] = ["unopened", "triaged", "watching", "dismissed"];

/** The asset table and the fragment table are one component with two callers.
 *
 *  They are different endpoints and different claims, but the same row: an asset
 *  IS a fragment plus the attribution that put it in a role. Two components
 *  would be two renderings of `judgement` drifting apart. */
export function AssetTable({
  workspaceId,
  assets,
  fragments,
  targets,
}: {
  workspaceId: string;
  assets?: Asset[];
  fragments?: Fragment[];
  targets?: Target[];
}) {
  const rows: (Fragment | Asset)[] = assets ?? fragments ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const open = rows.find((r) => r.fragment_id === openId);
  const asAsset = (row: Fragment | Asset): Asset | null =>
    "attribution_id" in row ? row : null;

  const run = (act: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = await act();
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
    });

  return (
    <>
      {refusal ? (
        <Alert tone="warn"><Text size="sm">{refusal}</Text></Alert>
      ) : null}

      <div className={s.scroll}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">kind</th>
              <th scope="col">value</th>
              <th scope="col">origin</th>
              <th scope="col" className={s.num}>observations</th>
              <th scope="col">judgement</th>
              <th scope="col">read</th>
              {assets ? <th scope="col">attributed by</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const asset = asAsset(row);
              return (
                <tr
                  key={row.fragment_id}
                  className={s.row}
                  data-open={row.fragment_id === openId}
                  onClick={() => setOpenId(row.fragment_id)}
                >
                  <td><Badge mono>{row.kind}</Badge></td>
                  <td className={s.value}>{row.value}</td>
                  <td className={s.quiet}>{row.origin}</td>
                  <td className={s.num}>{row.observations}</td>
                  <td>
                    <Badge tone={row.judgement.state === "dismissed" ? "neutral" : "accent"} mono>
                      {row.judgement.state}
                    </Badge>
                  </td>
                  <td>
                    {/* A human READ, and NOT the judgement. Absent means nobody
                        has looked, which is a different fact from nobody having
                        ruled — and both columns are here for that reason. */}
                    <Presence of={row.read_at ? present("read") : absent()} compact />
                  </td>
                  {assets ? (
                    <td className={s.quiet}>{asset?.claimant ?? "—"}</td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AssetDrawer
        workspaceId={workspaceId}
        row={open ?? null}
        target={targets?.find((t) => t.target_id === asAsset(open ?? ({} as Fragment))?.target_id)}
        onClose={() => { setOpenId(null); setReason(""); }}
        pending={pending}
        footer={
          open ? (
            <>
              <div className={s.actions}>
                <Button
                  size="sm"
                  disabled={pending || Boolean(open.read_at)}
                  onClick={() => run(() => markReadAction(workspaceId, open.fragment_id))}
                >
                  {open.read_at ? "Already read" : "Mark read"}
                </Button>
                {JUDGEMENTS.filter((j) => j !== open.judgement.state).map((j) => (
                  <Button
                    key={j}
                    size="sm"
                    intent="ghost"
                    disabled={pending || (j === "dismissed" && reason.trim() === "")}
                    onClick={() =>
                      run(() =>
                        judgeAction(
                          workspaceId,
                          open.fragment_id,
                          j,
                          j === "dismissed" ? reason : undefined,
                        ),
                      )
                    }
                  >
                    {j}
                  </Button>
                ))}
              </div>
              {/* Dismissal requires a reason and triage does not — the server's
                  own sentence, put under the field rather than a generic
                  required-field message. */}
              <div className={s.reason}>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="why it is being dismissed"
                />
                <Text size="xs" tone="tertiary">
                  A dismissal with no reason reads as <em>never looked at</em> in
                  six months, which is why the server refuses one.
                </Text>
              </div>
            </>
          ) : null
        }
      />

      {rows.length > 12 ? (
        <Panel title="Reading this table">
          <Text size="xs" tone="tertiary">
            Rows are not deduplicated across runs. Two runs a day apart are two
            statements, and collapsing them would lose the second date.
          </Text>
        </Panel>
      ) : null}
    </>
  );
}
