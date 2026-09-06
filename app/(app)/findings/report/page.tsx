import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Report";
const SUB =
  "The engagement written up, with every claim carrying the evidence that produced it. Sections are toggles; the preview is what the client receives.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
