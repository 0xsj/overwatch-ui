import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Across targets";
const SUB =
  "The same address, certificate or person appearing under more than one engagement. This is the answer people most want and the one with the sharpest consequences, so it is off by default and it is a question this product has not settled.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
