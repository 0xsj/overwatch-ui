import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Mock } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { isAppError } from "@/lib/kernel";
import { anonymousClient } from "@/lib/root";
import { readInvite, type Invite } from "@/lib/services/access";
import { AuthShell } from "../../_components/auth-shell";
import { InviteForm } from "./invite-form";
import s from "../../_components/auth.module.css";

export const metadata: Metadata = { title: "You have been invited — Overwatch" };

/** `guest` and `client` are the two roles that face outward. Everything else is
 *  inside the firm — `decisions/0019`. */
const isExternal = (role: Invite["role"]) => role === "guest" || role === "client";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let invite: Invite;
  try {
    invite = await readInvite(anonymousClient("access"), token);
  } catch (error) {
    const message = isAppError(error) ? error.message : "This invitation could not be read.";
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
      </AuthShell>
    );
  }

  const external = isExternal(invite.role);

  return (
    <AuthShell
      title="You have been invited"
      blurb={
        <>
          Read what this gives you before you accept it.{" "}
          <Mock note="No invite endpoint exists yet — decisions/0019 defines the model and the commands that write it arrive with this flow. Nobody sent this, and accepting it creates no account." />
        </>
      }
    >
      <div className={s.facts}>
        <div className={s.fact}>
          <span className={s.factKey}>organisation</span>
          <span className={s.factVal}><Text size="sm">{invite.org_name}</Text></span>
        </div>
        <div className={s.fact}>
          <span className={s.factKey}>invited by</span>
          <span className={s.factVal}><span className={s.mono}>{invite.invited_by}</span></span>
        </div>
        <div className={s.fact}>
          <span className={s.factKey}>as</span>
          <span className={s.factVal}>
            <Badge tone={external ? "info" : "accent"} glyph={external ? "◔" : "✓"} mono>
              {invite.role}
            </Badge>
            {external ? <Text size="xs" tone="quiet">outside the organisation</Text> : null}
          </span>
        </div>

        {/* The optional first grant, and the reason invite and grant are one
            flow. An invitation carrying none lands you in an org where you can
            see nothing — correct under 0019, and a terrible first screen. */}
        <div className={s.fact}>
          <span className={s.factKey}>starts you on</span>
          <span className={s.factVal}>
            {invite.first_grant ? (
              <>
                <Text size="sm">{invite.first_grant.workspace_name}</Text>
                <Badge tone="neutral" mono>{invite.first_grant.level}</Badge>
              </>
            ) : (
              <Text size="sm" tone="tertiary">
                Nothing yet — somebody has to put you on an engagement
              </Text>
            )}
          </span>
        </div>

        <div className={s.fact}>
          <span className={s.factKey}>your email</span>
          <span className={s.factVal}><span className={s.mono}>{invite.email}</span></span>
        </div>

        {/* The INVITATION expires. Access does not, and this screen must not
            imply it does: `0019` names guest and client as the two roles that
            need a time box and did not build one, and `ALIGNMENT.md` says
            plainly — do not design a screen that promises an end date the
            server cannot store. */}
        <div className={s.fact}>
          <span className={s.factKey}>link expires</span>
          <span className={s.factVal}>
            <Badge tone="warn" glyph="▲" mono>{invite.expires_at.slice(0, 10)}</Badge>
            <Text size="xs" tone="quiet">the invitation, not the access</Text>
          </span>
        </div>
      </div>

      {external ? (
        <Alert tone="info">
          <Text size="sm">
            An engagement ends and outside access should end with it. Nothing stores an
            expiry yet, so whoever invited you has to take it away by hand — which is
            worth knowing rather than assuming.
          </Text>
        </Alert>
      ) : null}

      <InviteForm token={invite.token} />
    </AuthShell>
  );
}
