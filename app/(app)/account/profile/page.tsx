import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Your profile";
const SUB =
  "The name here is the one that goes on the audit trail. Every attribution you accept, every judgement you make and every severity you override names this account — which is why removing somebody archives them rather than deleting them.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE} mock>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
