import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Check your email — Overwatch" };

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your email"
      blurb="If that address has an account, a single-use link is on its way. It expires in one hour."
      below={
        <Text size="sm" tone="tertiary">
          Wrong address? <Link href="/forgot-password" className={s.link}>Try another</Link>
        </Text>
      }
    >
      <Alert glyph="✉">
        <Text size="sm">
          The link signs you in once and then stops working. Following it a second
          time is expected to fail, and that is the point of it.
        </Text>
      </Alert>
      <Text size="xs" tone="quiet">
        This page exists so the flow can be seen end to end. No mail is sent from
        this build.
      </Text>
    </AuthShell>
  );
}
