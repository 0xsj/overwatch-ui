"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { openWorkspaceAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../settings.module.css";

export function OpenWorkspaceForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState(
    openWorkspaceAction.bind(null, orgId),
    initialFormState,
  );

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">Opened. It is in the list above and in the switcher.</Text>
        </Alert>
      ) : null}

      <Field label="Name" error={errorFor(state, "name")} required>
        {(aria) => <Input {...aria} name="name" placeholder="Acme Q3" />}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Opening" : "Open it"}
      </Button>
    </form>
  );
}
