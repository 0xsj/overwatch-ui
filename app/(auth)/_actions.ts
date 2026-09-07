"use server";

import { redirect } from "next/navigation";
import { anonymousClient, startSession } from "@/lib/root";
import { FIXTURE_PASSWORD, PERSONAS, type PersonaName } from "@/lib/root/fixtures";
import { acceptInvite } from "@/lib/services/access";
import {
  confirmEmailChange,
  confirmReset,
  confirmVerification,
  register,
  requestReset,
  requestVerification,
  signIn,
} from "@/lib/services/identity";
import { toFormState, type FormState } from "./_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "");

/** Sign-in is the one action that writes a cookie, and it redirects rather than
 *  returning `ok`. A form that succeeds and stays put is a screen telling
 *  somebody their password worked and leaving them on the door. */
export async function signInAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    const session = await signIn(anonymousClient("identity"), {
      email: str(data, "email"),
      password: str(data, "password"),
    });
    await startSession(session.token);
  } catch (error) {
    return toFormState(error);
  }
  redirect("/home");
}

/** `name` is omitted rather than sent empty: the server falls back to the local
 *  part of the address, and sending `""` would defeat that. */
export async function registerAction(_prev: FormState, data: FormData): Promise<FormState> {
  const name = str(data, "name").trim();
  try {
    const account = await register(anonymousClient("identity"), {
      email: str(data, "email"),
      password: str(data, "password"),
      ...(name ? { name } : {}),
    });
    return { status: "ok", account };
  } catch (error) {
    return toFormState(error);
  }
}

export async function requestResetAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await requestReset(anonymousClient("identity"), str(data, "email"));
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

export async function requestVerificationAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await requestVerification(anonymousClient("identity"), str(data, "email"));
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

/** The token arrives as `?token=` on THIS application's URL and is POSTed in a
 *  body. It is never put in a server URL, where it is written into every access
 *  log it passes and leaks onward in a `Referer`. */
export async function confirmVerificationAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    const account = await confirmVerification(anonymousClient("identity"), {
      token: str(data, "token"),
    });
    return { status: "ok", account };
  } catch (error) {
    return toFormState(error);
  }
}

/** The third link route. Confirming also flips a `pending` account to `active`,
 *  because a confirmed address is a proved address — so this is a verification
 *  as well as a switch, and the screen says both. */
export async function confirmEmailChangeAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    const account = await confirmEmailChange(anonymousClient("identity"), {
      token: str(data, "token"),
    });
    return { status: "ok", account };
  } catch (error) {
    return toFormState(error);
  }
}

export async function confirmResetAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await confirmReset(anonymousClient("identity"), {
      token: str(data, "token"),
      password: str(data, "password"),
    });
  } catch (error) {
    return toFormState(error);
  }
  redirect("/sign-in?reset=done");
}

export async function acceptInviteAction(_prev: FormState, data: FormData): Promise<FormState> {
  const name = str(data, "name").trim();
  const password = str(data, "password");
  try {
    await acceptInvite(anonymousClient("access"), {
      token: str(data, "token"),
      ...(name ? { name } : {}),
      ...(password ? { password } : {}),
    });
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

/** Sign in as one of the two fixture tenants.
 *
 *  It writes the same cookie a real sign-in writes, with a `fixture_` bearer —
 *  which is the whole mechanism: `lib/root` sees a fake session and serves
 *  every domain from fixtures, so there is no second mode and no flag. The
 *  yellow badge in the chrome hangs off exactly that.
 *
 *  It exists on the sign-in screen rather than in a dev panel because signing in
 *  is precisely what it does, and a persona is only meaningful as an answer to
 *  "who is asking". */
export async function signInAsPersonaAction(persona: PersonaName): Promise<void> {
  await startSession(`fixture_${persona}`);
  redirect("/home");
}

export async function personaChoices(): Promise<
  { name: PersonaName; label: string; blurb: string; email: string }[]
> {
  return (Object.keys(PERSONAS) as PersonaName[]).map((name) => ({
    name,
    label: PERSONAS[name].label,
    blurb: PERSONAS[name].blurb,
    email: PERSONAS[name].me.email,
  }));
}

export async function fixturePassword(): Promise<string> {
  return FIXTURE_PASSWORD;
}
