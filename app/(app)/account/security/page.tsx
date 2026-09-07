import type { Metadata } from "next";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { isPresent, present, unattempted, type Presence } from "@/lib/kernel";
import { clientFor } from "@/lib/root";
import { listSessions, type MeSession } from "@/lib/services/identity";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { PasswordForm } from "./password-form";
import { CloseAccountForm } from "./close-form";
import { Sessions } from "./sessions";
import s from "../account.module.css";

const TITLE = "Security";
const SUB =
  "Your password and the sessions currently signed in as you. A session you do not recognise is the one thing on this screen worth acting on immediately.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
  const shell = await loadShell();

  let sessions: Presence<MeSession[]>;
  try {
    sessions = present(await listSessions(await clientFor("identity")));
  } catch {
    sessions = unattempted();
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title="Change your password"
        note="This ends every other session and keeps this one, so you stay signed in here."
      >
        <PasswordForm />
      </Panel>

      <Panel
        title="Signed in as you"
        note="Shown exactly as each client sent it. Nothing is tidied into a device name, because the point is to spot one you do not recognise."
      >
        {isPresent(sessions) ? (
          <Sessions sessions={sessions.value} />
        ) : (
          <Text size="sm" tone="tertiary">
            Never checked — the session list could not be read. That is not the
            same as having none.
          </Text>
        )}
      </Panel>

      <Panel title="If you have lost your password">
        <Text size="sm" tone="tertiary">
          A reset link goes to <span className={s.mono}>{shell.me.email}</span> and
          ends every session signed in as you, including this one. That is the
          right tool when you cannot supply the current password above.
        </Text>
        <Text size="sm" tone="tertiary">
          <a href="/forgot-password" className={s.mono}>Send myself a reset link</a>
        </Text>
      </Panel>

      <Panel
        title="Close your account"
        note="Terminal. Refused only where somebody would be stranded — being the last owner of an org that is only you does not count."
      >
        <CloseAccountForm />
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          Ending a session here does not end it everywhere — a password change
          does. If you think somebody else is signed in as you, change the
          password rather than ending rows one at a time.
        </Text>
      </Alert>
    </>
  );
}
