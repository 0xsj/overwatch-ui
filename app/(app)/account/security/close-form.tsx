"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/overlays";
import { Text } from "@/components/typography";
import { closeAccountAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../account.module.css";

/** Terminal, and the copy may not soften it.
 *
 *  Closing cannot be undone. The address becomes registrable again and
 *  registering it makes a NEW account — new id, no history, not the same person
 *  as far as the record is concerned. So nothing here says "you can come back",
 *  because that would be false in the way that matters: the audit trail will not
 *  know them.
 *
 *  The refusal names the orgs where somebody would be stranded and is rendered
 *  as sent. It is the only place the person learns what to do about it, and both
 *  fixes are endpoints they already have. */
export function CloseAccountForm() {
  const [state, action, pending] = useActionState(closeAccountAction, initialFormState);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button intent="ghost">Close my account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this account?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. Your address becomes available again, and
            registering with it later creates a new account with no history — the
            record will not know it as you.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={action} noValidate className={s.form}>
          <FormError state={state} />
          <Field
            label="Your current password"
            error={errorFor(state, "current_password")}
            required
          >
            {(aria) => (
              <Input {...aria} name="current_password" type="password" autoComplete="current-password" />
            )}
          </Field>
          <Text size="xs" tone="tertiary">
            Every session signed in as you ends immediately, including this one.
          </Text>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button type="submit" intent="primary" loading={pending}>
              {pending ? "Closing" : "Close it"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
