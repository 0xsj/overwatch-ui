import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Members";
const SUB =
  "Who is in this organisation and what they can do. A claimant is an account, so every human attribution in the record points at a row on this screen — which is why removing somebody archives them rather than deleting them.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
