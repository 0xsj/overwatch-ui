import type { Metadata } from "next";
import { PageHead } from "../../_components/page-head";
import { Unbuilt } from "../../_components/unbuilt";

const TITLE = "Health";
const SUB =
  "The machinery's own vitals. Orchestration is the unglamorous half of this product and the half that breaks silently — a tool that vanished from PATH looks exactly like a host that stopped answering, unless something is watching for it.";

export const metadata: Metadata = { title: TITLE };

export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Unbuilt />
    </>
  );
}
