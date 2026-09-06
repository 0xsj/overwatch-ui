import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { ForgotForm } from "./forgot-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Reset your password — Overwatch" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      blurb="We send a single-use link. Resetting a password does not end sessions on other devices — that is a separate action, and it is on the account screen."
      below={
        <Text size="sm" tone="tertiary">
          Remembered it? <Link href="/sign-in" className={s.link}>Sign in</Link>
        </Text>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
