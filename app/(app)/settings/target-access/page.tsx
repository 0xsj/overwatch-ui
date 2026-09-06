import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Target access";
const SUB =
  "Which member sees which engagement. This is the grid a consultancy actually buys — a client contact who can read their own report and nothing else, and an analyst who cannot see the engagement they are not on.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
