"use server";

import { auth } from "@/lib/auth";
import type { FormState } from "./_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "");

export async function signInAction(_prev: FormState, data: FormData): Promise<FormState> {
  const r = await auth.signIn(str(data, "email"), str(data, "password"));
  return r.ok ? { status: "ok" } : { status: "error", message: r.message, field: r.field };
}

export async function signUpAction(_prev: FormState, data: FormData): Promise<FormState> {
  const r = await auth.signUp({
    name: str(data, "name"),
    email: str(data, "email"),
    password: str(data, "password"),
    workspace: str(data, "workspace"),
  });
  return r.ok ? { status: "ok" } : { status: "error", message: r.message, field: r.field };
}

export async function requestResetAction(_prev: FormState, data: FormData): Promise<FormState> {
  const r = await auth.requestReset(str(data, "email"));
  return r.ok ? { status: "ok" } : { status: "error", message: r.message, field: r.field };
}

export async function acceptInviteAction(_prev: FormState, data: FormData): Promise<FormState> {
  const r = await auth.acceptInvite(str(data, "token"), str(data, "name"), str(data, "password"));
  return r.ok ? { status: "ok" } : { status: "error", message: r.message, field: r.field };
}
