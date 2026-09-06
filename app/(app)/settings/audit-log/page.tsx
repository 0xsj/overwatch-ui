import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Audit log";
const SUB =
  "Who changed what, and when. Scope edits and accepted attributions are here because both change what the record claims — and “who widened the scope” is a question that gets asked after an engagement, not during it.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
