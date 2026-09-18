"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Badge, Panel, Presence } from "@/components/display";
import { Button, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { absent, present } from "@/lib/kernel";
import type { Asset, Fragment, FragmentDetail, JudgementState } from "@/lib/services/entities";
import type { Target } from "@/lib/services/targets";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../_hooks";
import { judgeAction, markReadAction, readFragmentAction } from "../_actions";
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
  const afterWrite = useAfterWrite();
  /** `null` while it is still being read — the drawer renders the row it
   *  already has and fills the edges in when they land, rather than blocking. */
  const [detail, setDetail] = useState<FragmentDetail | null>(null);

  const open = rows.find((r) => r.fragment_id === openId);

  /* OPENING THE DRAWER IS READING IT — `decisions/0037` §4.
   *
   *  A person who opened the record and looked at it has read it. The obvious
   *  implementation sets the judgement and calls that a read; the wire keeps
   *  the two apart on purpose and **nothing but the client can keep them apart
   *  in practice**, because only the client knows a drawer was opened.
   *
   *  Fired once per fragment, guarded by a ref rather than by state: this must
   *  not re-fire under Strict Mode's double invocation, and it must not re-fire
   *  when the row re-renders after the write lands. */
  const sent = useRef(new Set<string>());
  useEffect(() => {
    if (!open || open.read_at || sent.current.has(open.fragment_id)) return;
    sent.current.add(open.fragment_id);
    void afterWrite(() => markReadAction(workspaceId, open.fragment_id), [
      keys.entities.all(workspaceId),
      keys.coverage(workspaceId),
    ]);
  }, [open, workspaceId, afterWrite]);

  /* Opening a row is an ACT, so the read hangs off the click rather than off a
     render. The guard is the id rather than a cleanup flag: clicking through
     three rows quickly must not let the first read land last and show the wrong
     record's edges. */
  const wanted = useRef<string | null>(null);
  function openRow(fragmentId: string) {
    setOpenId(fragmentId);
    setDetail(null);
    wanted.current = fragmentId;
    void readFragmentAction(workspaceId, fragmentId).then((r) => {
      if (wanted.current === fragmentId && "detail" in r) setDetail(r.detail);
    });
  }
  const asAsset = (row: Fragment | Asset): Asset | null =>
    "attribution_id" in row ? row : null;

  const run = (act: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      /* A judgement and a read both move the coverage grid — `READ BY YOU` is
         a check, so marking one read changes a cell. Naming both domains here
         is the difference between the grid updating and it lying until a
         reload. */
      const result = (await afterWrite(act, [
        keys.entities.all(workspaceId),
        keys.coverage(workspaceId),
      ])) as { status: string; message?: string };
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
                  onClick={() => openRow(row.fragment_id)}
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
        detail={detail?.fragment_id === openId ? detail : null}
        nameOf={(id) => rows.find((r) => r.fragment_id === id)?.value}
        target={targets?.find((t) => t.target_id === asAsset(open ?? ({} as Fragment))?.target_id)}
        onClose={() => {
          setOpenId(null);
          setDetail(null);
          wanted.current = null;
          setReason("");
        }}
        pending={pending}
        footer={
          open ? (
            <>
              <div className={s.actions}>
                {/* Still here, and it is not redundant. Opening the drawer
                    records the read, but a write can fail and this is the
                    retry — and a person who wants to say "yes, I looked"
                    explicitly should be able to. */}
                <Button
                  size="sm"
                  disabled={pending || Boolean(open.read_at)}
                  onClick={() => run(() => markReadAction(workspaceId, open.fragment_id))}
                >
                  {open.read_at ? "Read" : "Mark read"}
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
