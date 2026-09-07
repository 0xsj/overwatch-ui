import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Security";
const SUB =
  "Your password and the sessions currently signed in as you. A session you do not recognise is the one thing on this screen worth acting on immediately.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE} mock>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
