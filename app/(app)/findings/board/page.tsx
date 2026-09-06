import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Findings";
const SUB =
  "A finding is a claim that something is wrong, and it has a lifecycle. It is not an observation — an observation is what a tool said, and it stays true after the finding is dismissed.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
