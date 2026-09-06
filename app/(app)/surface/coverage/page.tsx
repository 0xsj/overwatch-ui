import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Coverage";
const SUB =
  "What has never been looked at. Every other tool answers what is out there; this grid answers the question that comes after it, and a filled cell is a question nobody has asked — not a clean result.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
