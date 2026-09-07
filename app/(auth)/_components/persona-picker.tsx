"use client";

import { Mock } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { signInAsPersonaAction } from "../_actions";
import s from "./persona-picker.module.css";

export type PersonaChoice = { name: string; label: string; blurb: string; email: string };

/** The two fixture tenants, offered where signing in happens.
 *
 *  It is here rather than in a dev panel because a persona is only meaningful as
 *  an answer to *who is asking*, and choosing one writes the same session cookie
 *  a real sign-in writes — with a `fixture_` bearer, which is what makes every
 *  domain serve fixtures for the rest of that session. One mechanism, no flag.
 *
 *  Two rather than one because a solo hunter's org and a firm's are the same
 *  screens showing opposite things: one row against five roles, no grants
 *  against a wall between engagements. Holding both means each is reachable
 *  rather than described. */
export function PersonaPicker({ choices }: { choices: PersonaChoice[] }) {
  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <Text size="xs" tone="quiet" className={s.rule}>or look around with invented data</Text>
        <Mock note="Signing in as a persona serves every screen from fixtures. Nothing is stored and no email is sent." />
      </div>

      <div className={s.grid}>
        {choices.map((c) => (
          <form key={c.name} action={signInAsPersonaAction.bind(null, c.name as never)}>
            <Button type="submit" intent="ghost" className={s.card}>
              <span className={s.label}>{c.label}</span>
              <span className={s.email}>{c.email}</span>
              <span className={s.blurb}>{c.blurb}</span>
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
