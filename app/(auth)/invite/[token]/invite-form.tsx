"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/display";
import { Text } from "@/components/typography";
import { acceptInviteAction } from "../../_actions";
import { initialFormState } from "../../_form-state";
import { errorFor, FormError } from "../../_components/form-error";
import s from "../../_components/auth.module.css";

export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initialFormState);

  return (
    <form action={action} noValidate className={s.form}>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            That would have joined you to the workspace. Nothing was stored — this
            build has no backend.
          </Text>
        </Alert>
      ) : null}

      <Field
        label="Your name"
        hint="This is what the workspace sees beside anything you accept, reject or dismiss."
        error={errorFor(state, "name")}
        required
      >
        {(aria) => <Input {...aria} name="name" autoComplete="name" placeholder="M. Okafor" />}
      </Field>

      <Field
        label="Choose a password"
        hint="At least twelve characters."
        error={errorFor(state, "password")}
        required
      >
        {(aria) => <Input {...aria} name="password" type="password" autoComplete="new-password" />}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Joining" : "Accept and join"}
      </Button>
    </form>
  );
}
