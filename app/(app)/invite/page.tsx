import type { Metadata } from "next";
import { InviteScreen } from "./invite-screen";

export const metadata: Metadata = { title: "An invitation — Overwatch" };

export default function Page() {
  return <InviteScreen />;
}
