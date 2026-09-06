import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Extraction quality";
const SUB =
  "How much of what the tools printed actually became an observation. This is the number the compounding loop lives or dies on, and it has never run long enough for anyone to know whether it improves.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
