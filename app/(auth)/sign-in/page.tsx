import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { servedByFixtures } from "@/lib/root";
import { AuthShell } from "../_components/auth-shell";
import { PersonaPicker } from "../_components/persona-picker";
import { personaChoices } from "../_actions";
import { SignInForm } from "./sign-in-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Sign in — Overwatch" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  const choices = await personaChoices();

  return (
    <AuthShell
      title="Sign in"
      blurb="Every action you take from here names you in the audit trail."
      note={
        servedByFixtures("identity") ? (
          <>
            No server is configured, so the only accounts that exist are the two
            personas below.
          </>
        ) : undefined
      }
      below={
        <Text size="sm" tone="tertiary">
          No workspace yet? <Link href="/sign-up" className={s.link}>Create one</Link>
        </Text>
      }
      >
      <SignInForm reset={reset === "done"} />
      {/* Fixture personas are a deliberate no-backend development path. Once
          the real API is configured, leaving them on this page makes a live
          build look like a demo and makes it too easy to enter the wrong data
          plane. */}
      {servedByFixtures("identity") ? <PersonaPicker choices={choices} /> : null}
    </AuthShell>
  );
}
