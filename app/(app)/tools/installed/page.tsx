import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Installed tools";
const SUB =
  "A tool is a definition and a field mapping, never an integration. Paste what it prints, say which field is which, and it is a tool — no plugin, no release, nobody's pull request.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
