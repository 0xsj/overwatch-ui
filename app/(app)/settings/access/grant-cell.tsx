"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/forms";
import { GRANT_LADDER, GRANT_MEANING, type GrantLevel } from "@/lib/services/tenancy";
import s from "./grant-cell.module.css";

/** One cell of the grid, and `none` is a value in it rather than an empty one.
 *
 *  Writing `none` and revoking are the same act, so there is one control and one
 *  call. What `none` must never become is a *rendered* state elsewhere: a
 *  workspace somebody holds `none` on is absent from their switcher, absent from
 *  their counts and absent from their breadcrumbs. It is visible here because
 *  this is the screen for the person doing the granting, who can already see
 *  every engagement in the org. */
export function GrantCell({
  orgId,
  workspaceId,
  accountId,
  level,
  editable,
}: {
  orgId: string;
  workspaceId: string;
  accountId: string;
  level: GrantLevel;
  editable: boolean;
}) {
  const [value, setValue] = useState<GrantLevel>(level);
  const [pending, start] = useTransition();

  if (!editable) {
    return (
      <span className={s.readonly} data-level={value} title={GRANT_MEANING[value]}>
        {value}
      </span>
    );
  }

  const change = (next: string) => {
    const wanted = next as GrantLevel;
    const previous = value;
    setValue(wanted);
    start(async () => {
      const { setGrantAction } = await import("../_actions");
      const result = await setGrantAction(orgId, workspaceId, accountId, wanted);
      if (result.status === "error") setValue(previous);
    });
  };

  return (
    <Select value={value} onValueChange={change} disabled={pending}>
      <SelectTrigger className={s.trigger} data-level={value}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GRANT_LADDER.map((l) => (
          <SelectItem key={l} value={l} title={GRANT_MEANING[l]}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
