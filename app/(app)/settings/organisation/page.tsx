import type { Metadata } from "next";
import { OrganisationScreen } from "./organisation-screen";

export const metadata: Metadata = { title: "Organisation" };

export default function Page() {
  return <OrganisationScreen />;
}
