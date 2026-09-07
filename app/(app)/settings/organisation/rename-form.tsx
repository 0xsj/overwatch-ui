"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { renameOrgAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../settings.module.css";

export function RenameOrgForm({ orgId, name }: { orgId: string; name: string }) {
  const [state, action, pending] = useActionState(
    renameOrgAction.bind(null, orgId),
    initialFormState,
  );

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />
      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">Renamed. The audit log records what it was called before.</Text>
        </Alert>
      ) : null}
      <Field label="Name" error={errorFor(state, "name")} required>
        {(aria) => <Input {...aria} name="name" defaultValue={name} />}
      </Field>
      <Button type="submit" loading={pending}>{pending ? "Saving" : "Save"}</Button>
    </form>
  );
}
