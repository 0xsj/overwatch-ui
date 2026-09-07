"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { signUpAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { errorFor, FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialFormState);

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            That would have created a workspace. Nothing was stored — this build has
            no backend, so there is no account and no confirmation on its way.
          </Text>
        </Alert>
      ) : null}

      <Field
        label="Your name"
        hint="This is what appears beside every claim you make and every judgement you record."
        error={errorFor(state, "name")}
        required
      >
        {(aria) => <Input {...aria} name="name" autoComplete="name" placeholder="S. Jarratt" />}
      </Field>

      <Field label="Work email" error={errorFor(state, "email")} required>
        {(aria) => (
          <Input {...aria} name="email" type="email" autoComplete="username" placeholder="you@firm.example" />
        )}
      </Field>

      <Field
        label="Workspace"
        hint="One hunter or a firm with many engagements — either way it needs a name, because scope and access hang off it."
        error={errorFor(state, "workspace")}
        required
      >
        {(aria) => <Input {...aria} name="workspace" placeholder="31m" />}
      </Field>

      <Field
        label="Password"
        hint="At least twelve characters. Length beats punctuation."
        error={errorFor(state, "password")}
        required
      >
        {(aria) => <Input {...aria} name="password" type="password" autoComplete="new-password" />}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Creating" : "Create the workspace"}
      </Button>
    </form>
  );
}
