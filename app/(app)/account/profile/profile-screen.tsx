"use client";

import { Badge, Panel } from "@/components/display";
import { useShell } from "../../_hooks";
import { Text } from "@/components/typography";
import { PageHead } from "../../_components/page-head";
import { EmailForm } from "./email-form";
import { RenameForm } from "./rename-form";
import s from "../account.module.css";

const TITLE = "Your profile";
const SUB =
  "The name here is the one that goes on the audit trail. Every attribution you accept, every judgement you make and every severity you override names this account — which is why removing somebody archives them rather than deleting them.";

export function ProfileScreen() {
  const shell = useShell();

  /* Seeded by the layout, so this is a type obligation rather than a state
     anybody sees. Guarding once here keeps every read below non-optional —
     the alternative is a `?.` on forty call sites and a form prop that has to
     accept `undefined` it will never receive. */
  if (!shell) return <Text size="sm" tone="quiet">Reading your account…</Text>;

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel title="What the record says about you">
        <dl className={s.facts}>
          <div className={s.fact}>
            <dt>Email</dt>
            <dd className={s.mono}>
              {shell.me.email}{" "}
              {shell.me.verified ? (
                <Badge tone="accent" glyph="✓">proven</Badge>
              ) : (
                <Badge tone="warn" glyph="▲">not proven</Badge>
              )}
            </dd>
          </div>
          <div className={s.fact}>
            <dt>Account</dt>
            <dd className={s.mono}>{shell.me.account_id}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Your name">
        <RenameForm name={shell.name} />
      </Panel>

      <Panel
        title="Your email address"
        note="Prove the new one before it takes effect. Until then the old address is still your login."
      >
        <EmailForm current={shell.me.email} />
      </Panel>
    </>
  );
}
