import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { SignUpForm } from "./sign-up-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Create a workspace — Overwatch" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create a workspace"
      blurb="Free for one person, permanently. Every tool, the full lineage, the coverage grid."
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
