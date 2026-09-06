import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Assets";
const SUB =
  "Everything attributed to this target, with what is known and how sure we are that it is theirs. Three states are kept apart on every row: found, looked for and not there, and never looked for at all.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
