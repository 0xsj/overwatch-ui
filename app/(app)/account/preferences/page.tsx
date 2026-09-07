import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Your preferences";
const SUB =
  "What you see, and only you. None of this is a fact about the organisation, so none of it is stored against one — it follows you between engagements and nobody else is affected by it.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE} mock>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
