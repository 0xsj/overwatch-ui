import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Chip } from "@/components/display";
import { Text } from "@/components/typography";
import { isAppError } from "@/lib/kernel";
import { http } from "@/lib/root";
import { readInvite, type Invite } from "@/lib/services/auth";
import { AuthShell } from "../../_components/auth-shell";
import { InviteForm } from "./invite-form";
import s from "../../_components/auth.module.css";

export const metadata: Metadata = { title: "You have been invited — Overwatch" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let invite: Invite;
  try {
    invite = await readInvite(http, token);
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "This invitation could not be read.";
    return (
      <AuthShell
        title="This invitation is not valid"
        below={
          <Text size="sm" tone="tertiary">
            Have an account? <Link href="/sign-in" className={s.link}>Sign in</Link>
          </Text>
        }
      >
        <Alert tone="crit">
          <Text size="sm">{message}</Text>
          <Text size="sm" tone="tertiary">
            Invitations are withdrawn rather than deleted, so whoever sent this can
            see that it was used or revoked, and issue another.
          </Text>
        </Alert>
        <Text size="xs" tone="quiet">
          Two fixtures exist in this build: <span className={s.mono}>inv_01JQ8H</span> and{" "}
          <span className={s.mono}>inv_01JQ8K</span>.
        </Text>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="You have been invited" blurb={<>Read what this gives you before you accept it.</>}>
      <div className={s.facts}>
        <div className={s.fact}>
          <span className={s.factKey}>workspace</span>
          <span className={s.factVal}><Text size="sm">{invite.workspace}</Text></span>
        </div>
        <div className={s.fact}>
          <span className={s.factKey}>invited by</span>
          <span className={s.factVal}><span className={s.mono}>{invite.invited_by}</span></span>
        </div>
        <div className={s.fact}>
          <span className={s.factKey}>as</span>
          <span className={s.factVal}>
            <Chip tone={invite.external ? "info" : "accent"} glyph={invite.external ? "◔" : "✓"}>
              {invite.role}
            </Chip>
            {invite.external ? <Text size="xs" tone="quiet">outside the organisation</Text> : null}
          </span>
        </div>
        <div className={s.fact}>
          <span className={s.factKey}>your email</span>
          <span className={s.factVal}><span className={s.mono}>{invite.email}</span></span>
        </div>
        <div className={s.fact}>
          <span className={s.factKey}>access ends</span>
          <span className={s.factVal}>
            {invite.expires_at ? (
              <>
                <Chip tone="warn" glyph="▲">{invite.expires_at}</Chip>
                <Text size="xs" tone="quiet">and is not renewed automatically</Text>
              </>
            ) : (
              <Text size="sm" tone="tertiary">Does not expire</Text>
            )}
          </span>
        </div>
      </div>

      {invite.external ? (
        <Alert tone="info">
          <Text size="sm">
            An engagement ends and so does this. A client login with no horizon is the
            whole risk of having one, so external access carries a date by default.
          </Text>
        </Alert>
      ) : null}

      <InviteForm token={invite.token} />
    </AuthShell>
  );
}
