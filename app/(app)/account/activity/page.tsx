import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Your record";
const SUB =
  "What is attached to your name. The audit log answers this for the organisation; this answers it for you — and it is the question people ask after an engagement rather than during it.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE} mock>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
