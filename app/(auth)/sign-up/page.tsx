import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { SignUpForm } from "./sign-up-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Register — Overwatch" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Register an account"
      blurb="This creates an account and nothing else. No workspace, no organisation, and no session — the endpoint takes an address, a password and a name, and answers with an account that is pending."
      below={
        <Text size="sm" tone="tertiary">
          Already have one? <Link href="/sign-in" className={s.link}>Sign in</Link>
        </Text>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
