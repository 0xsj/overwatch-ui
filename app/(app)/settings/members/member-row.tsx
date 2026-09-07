"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button } from "@/components/forms";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/overlays";
import { Text } from "@/components/typography";
import { EXTERNAL_ROLES, INTERNAL_ROLES, type OrgRole } from "@/lib/services/tenancy";
import { changeRoleAction, leaveOrgAction, removeMemberAction } from "../_actions";
import s from "../settings.module.css";

/** Writable again as of `decisions/0026`, and it was read-only for an hour on a
 *  previous entry's explicit instruction. Both were right when written.
 *
 *  Four refusals, and the first is the one with a design in it: **a 409 for the
 *  last owner must not disable the control.** The person needs telling why, and
 *  the answer is "promote somebody first" — a control that is simply absent
 *  teaches nothing and looks like a bug. */
export function MemberRow({
  orgId,
  accountId,
  role,
  name,
  self,
  /** An admin may not touch an owner — 403 — so the controls are not drawn for
   *  a row they cannot act on. This is the one case where hiding is right: it
   *  is a rule about the ACTOR, and no amount of explanation lets them proceed. */
  mayActOnOwners,
  /** How many engagements this person is on. Named in the confirmation, because
   *  removing revokes every one of them and re-inviting starts from nothing. */
  seats,
}: {
  orgId: string;
  accountId: string;
  role: OrgRole;
  name: string;
  self: boolean;
  mayActOnOwners: boolean;
  seats: number;
}) {
  const [value, setValue] = useState<OrgRole>(role);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const locked = role === "owner" && !mayActOnOwners;

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

  const go = (act: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      const result = await act();
      if (result?.status === "error") setRefusal(result.message ?? "That was refused.");
    });

  if (locked) {
    return (
      <div className={s.who}>
        <Badge tone="accent" mono>{value}</Badge>
        <Text size="xs" tone="quiet">only an owner may change an owner</Text>
      </div>
    );
  }

  return (
    <div className={s.who}>
      <div className={s.rowControls}>
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" intent="ghost" disabled={pending}>
              {self ? "Leave" : "Remove"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {self ? "Leave this organisation?" : `Remove ${name}?`}
              </AlertDialogTitle>
              {/* The number is the point. Demoting caps access and is
                  reversible; removing DELETES every grant, and re-inviting
                  starts from nothing. Somebody about to click this is usually
                  thinking of it as the strong version of a demotion. */}
              <AlertDialogDescription>
                {seats > 0
                  ? `This also removes ${self ? "your" : "their"} access to ${seats} ${seats === 1 ? "engagement" : "engagements"}. Re-inviting ${self ? "yourself" : "them"} will not restore it.`
                  : `${self ? "You are" : "They are"} not on any engagement, so nothing else is lost.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  go(() => (self ? leaveOrgAction(orgId) : removeMemberAction(orgId, accountId)))
                }
              >
                {self ? "Leave" : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {refusal ? <Text size="xs" tone="accent" role="alert">{refusal}</Text> : null}
      {self && !refusal ? <Text size="xs" tone="quiet">this is you</Text> : null}
    </div>
  );
}
