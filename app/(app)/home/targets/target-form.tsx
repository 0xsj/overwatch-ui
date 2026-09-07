"use client";

import { useActionState, useState } from "react";
import {
  Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import type { TargetKind } from "@/lib/services/targets";
import { addTargetAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../../tools/tools.module.css";

const KIND_SAYS: Record<TargetKind, string> = {
  organisation: "a firm, and everything attributed to it — the ASM framing",
  person: "a person, and the fragments attributed to them — the same machinery at a different root",
};

export function TargetForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState(
    addTargetAction.bind(null, workspaceId),
    initialFormState,
  );
  const [kind, setKind] = useState<TargetKind>("organisation");

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            Added, with no scope. Nothing can be spawned against it until a rule
            permits one — which is the gate working rather than a missing step.
          </Text>
        </Alert>
      ) : null}

      <Field
        label="Name"
        error={errorFor(state, "name")}
        hint="What you would call them in the report. It is what a refusal will name, so it is worth being the name a person recognises."
        required
      >
        {(aria) => <Input {...aria} name="name" placeholder="Halcyon Systems Ltd" />}
      </Field>

      <Field label="Kind" required>
        {(aria) => (
          <Select name="kind" value={kind} onValueChange={(v) => setKind(v as TargetKind)}>
            <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_SAYS) as TargetKind[]).map((k) => (
                <SelectItem key={k} value={k} title={KIND_SAYS[k]}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      <Text size="xs" tone="quiet">{KIND_SAYS[kind]}</Text>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Adding" : "Add it"}
      </Button>
    </form>
  );
}
