"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/forms";
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
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import {
  EXTERNAL_ROLES,
  GRANT_MEANING,
  INTERNAL_ROLES,
  type GrantLevel,
  type MeWorkspace,
  type OrgRole,
} from "@/lib/services/tenancy";
import { sendInviteAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../settings.module.css";

/** `none` is deliberately not offered.
 *
 *  On this form the absence of a first grant is expressed by choosing no
 *  engagement, not by choosing `none` on one — those read identically to the
 *  server and offering both would make "granted, at none" look like a state. */
const LEVELS: GrantLevel[] = ["read", "write", "admin"];

export function InviteForm({ orgId, workspaces }: { orgId: string; workspaces: MeWorkspace[] }) {
  const [state, action, pending] = useActionState(
    sendInviteAction.bind(null, orgId),
    initialFormState,
  );
  const [role, setRole] = useState<OrgRole>("member");
  const [workspace, setWorkspace] = useState<string>("");

  const external = role === "guest" || role === "client";

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">Invitation sent. It is in the list below until it is used.</Text>
        </Alert>
      ) : null}

      <Field label="Email" error={errorFor(state, "email")} required>
        {(aria) => (
          <Input {...aria} name="email" type="email" placeholder="them@firm.example" />
        )}
      </Field>

      <Field
        label="Role in the organisation"
        hint="What they are in the firm. It is a ceiling, not their access."
      >
        {() => (
          <Select name="role" value={role} onValueChange={(v) => setRole(v as OrgRole)}>
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
        )}
      </Field>

      {external ? (
        <Alert tone="warn">
          <Text size="sm">
            <strong>{role}</strong> faces outward and should be time-boxed. Nothing
            stores an expiry yet, so this access has to be taken away by hand — say
            so now rather than discover it at the end of the engagement.
          </Text>
        </Alert>
      ) : null}

      <Field
        label="Start them on"
        hint="Leave empty for an admin who manages people and is granted engagements separately."
      >
        {() => (
          <div className={s.pair}>
            <Select name="workspace_id" value={workspace} onValueChange={setWorkspace}>
              <SelectTrigger><SelectValue placeholder="No engagement" /></SelectTrigger>
              <SelectContent>
                {workspaces.map((w) => (
                  <SelectItem key={w.workspace_id} value={w.workspace_id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select name="level" defaultValue="read" disabled={!workspace}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l} title={GRANT_MEANING[l]}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Sending" : "Send the invitation"}
      </Button>
    </form>
  );
}
