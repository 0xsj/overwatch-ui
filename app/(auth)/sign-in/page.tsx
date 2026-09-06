import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { SignInForm } from "./sign-in-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Sign in — Overwatch" };

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      blurb="Every action you take from here names you in the audit trail."
      note={
        <>
          One fixture account exists: <strong>sj@vertexlabs.example</strong> with the
          password <strong>correct-horse-battery</strong>. Anything else is refused.
        </>
      }
      below={
        <Text size="sm" tone="tertiary">
          No workspace yet? <Link href="/sign-up" className={s.link}>Create one</Link>
        </Text>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
