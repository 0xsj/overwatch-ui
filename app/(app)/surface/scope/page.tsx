import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Scope";
const SUB =
  "What a tool may touch. Exclude always beats include, and the runner enforces it before it spawns anything — this is not a filter on what you see. A loud tool against an excluded host produces a refusal and no process.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
