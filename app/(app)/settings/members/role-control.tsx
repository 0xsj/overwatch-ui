"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/forms";
import { Text } from "@/components/typography";
import { EXTERNAL_ROLES, INTERNAL_ROLES, type OrgRole } from "@/lib/services/tenancy";
import { changeRoleAction } from "../_actions";
import s from "../settings.module.css";

/** Changing a role is the flow that has to refuse before it can ship.
 *
 *  An org must never lose its last owner. `org.ErrLastOwner` is declared in the
 *  backend, raised inside both storage adapters, and unreachable — no app-layer
 *  code calls the method that would trigger it, because there has never been a
 *  second member to demote one. The fixture refuses so this control has an error
 *  path before the server can produce one. */
export function MemberRoleControl({
  orgId,
  accountId,
  role,
  self,
}: {
  orgId: string;
  accountId: string;
  role: OrgRole;
  self: boolean;
}) {
  const [value, setValue] = useState<OrgRole>(role);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const change = (next: string) => {
    const wanted = next as OrgRole;
    const previous = value;
    setValue(wanted);
    setRefusal(null);
    start(async () => {
      const result = await changeRoleAction(orgId, accountId, wanted);
      if (result.status === "error") {
        setValue(previous);
        setRefusal(result.message);
      }
    });
  };

  return (
    <div className={s.who}>
      <Select value={value} onValueChange={change} disabled={pending}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Inside the firm</SelectLabel>
            {INTERNAL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Outward facing</SelectLabel>
            {EXTERNAL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {refusal ? <Text size="xs" tone="accent" role="alert">{refusal}</Text> : null}
      {self && !refusal ? <Text size="xs" tone="quiet">this is you</Text> : null}
    </div>
  );
}
