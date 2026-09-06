"use server";

import { http } from "@/lib/root";
import { acceptInvite, requestReset, signIn, signUp } from "@/lib/services/auth";
import { toFormState, type FormState } from "./_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "");

export async function signInAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await signIn(http, { email: str(data, "email"), password: str(data, "password") });
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

export async function signUpAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await signUp(http, {
      name: str(data, "name"),
      email: str(data, "email"),
      password: str(data, "password"),
      workspace: str(data, "workspace"),
    });
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

export async function requestResetAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await requestReset(http, str(data, "email"));
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

export async function acceptInviteAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await acceptInvite(http, {
      token: str(data, "token"),
      name: str(data, "name"),
      password: str(data, "password"),
    });
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}
