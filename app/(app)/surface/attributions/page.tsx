import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Attributions";
const SUB =
  "The claim that an asset belongs to this organisation — who claimed it, on what basis, and whether anybody has agreed. Nothing reaches the asset list without one, and every one of them names a claimant.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
