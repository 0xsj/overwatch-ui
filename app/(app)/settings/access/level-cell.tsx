"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/forms";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { GRANT_MEANING, levelsFor, type GrantLevel, type OrgRole } from "@/lib/services/tenancy";
import { revokeLevelAction, setLevelAction } from "../_actions";
import s from "./level-cell.module.css";

/** One person's level on one engagement.
 *
 *  Two controls rather than one, because the server has two verbs: `PUT` sets a
 *  level and `DELETE` revokes. There is no way to write `none`, so "no access"
 *  is the absence of a row and cannot be a value in the dropdown. This file
 *  offered `none` as a level until 2026-09-07, on the reasoning that revoking
 *  and granting-at-none should be one act — the server decided otherwise, and
 *  its version is the one that cannot express "granted, at none" at all.
 *
 *  The dropdown offers only the levels the role permits. The 409 is the
 *  backstop, not the design: a `client` cannot be given `write`, and a `member`
 *  or `guest` cannot be given `admin`. */
export function LevelCell({
  workspaceId,
  accountId,
  role,
  access,
  editable,
}: {
  workspaceId: string;
  accountId: string;
  role: OrgRole;
  access: GrantLevel;
  editable: boolean;
}) {
  const [value, setValue] = useState<GrantLevel>(access);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /* The org owner is on the list with `admin` and holds no grant row. A DELETE
     for them succeeds, deletes nothing and changes nothing, which looks broken —
     so the row is fixed and offers no control at all. */
  if (role === "owner") {
    return (
      <span className={s.fixed} title="The org owner is admin on every engagement, with no grant written.">
        admin · by role
      </span>
    );
  }

  if (!editable) {
    return <span className={s.readonly} title={GRANT_MEANING[value]}>{value}</span>;
  }

  const run = (next: GrantLevel, act: () => Promise<{ status: string; message?: string }>) => {
    const previous = value;
    setValue(next);
    setRefusal(null);
    start(async () => {
      const result = await act();
      if (result.status === "error") {
        setValue(previous);
        setRefusal(result.message ?? "That was refused.");
      }
    });
  };

  return (
    <div className={s.cell}>
      <Select
        value={value === "none" ? undefined : value}
        onValueChange={(next) =>
          run(next as GrantLevel, () =>
            setLevelAction(workspaceId, accountId, next as GrantLevel),
          )
        }
        disabled={pending}
      >
        <SelectTrigger className={s.trigger} data-level={value}>
          <SelectValue placeholder="no access" />
        </SelectTrigger>
        <SelectContent>
          {levelsFor(role).map((l) => (
            <SelectItem key={l} value={l} title={GRANT_MEANING[l]}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value !== "none" ? (
        <Button
          size="sm"
          intent="ghost"
          disabled={pending}
          onClick={() => run("none", () => revokeLevelAction(workspaceId, accountId))}
        >
          Revoke
        </Button>
      ) : null}

      {refusal ? <Text size="xs" tone="accent" role="alert">{refusal}</Text> : null}
    </div>
  );
}
