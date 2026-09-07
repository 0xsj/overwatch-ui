"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { renameAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../account.module.css";

/** No current password, and the asymmetry with the two forms below is the point.
 *
 *  A live session proves somebody who held the password once is here, not that
 *  the owner is — so the controls that convert a stolen session into permanent
 *  ownership sit behind a re-authentication. A display name is not one of those.
 *  Asking for a password to change it would train people to type their password
 *  into any form that asks for it, which is the habit the other two forms
 *  depend on NOT existing. */
export function RenameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(renameAction, initialFormState);

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">Changed. It is on the audit trail from here on.</Text>
        </Alert>
      ) : null}

      <Field
        label="Name"
        error={errorFor(state, "name")}
        hint="This is what the record shows against everything you decide."
        required
      >
        {(aria) => <Input {...aria} name="name" defaultValue={name} />}
      </Field>

      <Button type="submit" loading={pending}>{pending ? "Saving" : "Save"}</Button>
    </form>
  );
}
