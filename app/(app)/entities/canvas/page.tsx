import type { Metadata } from "next";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { listEntities, readCanvas } from "@/lib/services/entities";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { EntityCanvas } from "./_components/entity-canvas";
import { refOf, viewOf } from "./_layout/graph";

export const metadata: Metadata = { title: "Canvas" };

const SUB =
  "The node view over entities — one node per fragment, and an edge for every attribution behind it. The two edge kinds are drawn differently because only one of them is a claim.";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ root?: string; limit?: string }>;
}) {
  const { root, limit } = await searchParams;
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

  /* Entities are per ENGAGEMENT: what is whose is a claim about a client. With
     no engagement open there is nothing to draw, and that is a state rather
     than an error. */
  if (!workspace) {
    return (
      <>
        <PageHead title="Entity canvas">{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            No engagement open. An entity is assembled inside one, so there is
            nothing to draw until you are in one.
          </Text>
        </Alert>
      </>
    );
  }

  const client = await clientFor("entities");
  const roots = await listEntities(client, workspace.workspace_id).catch(() => []);
  const rootId = root ?? roots[0]?.entity_id;

  /* EVENTUALLY CONSISTENT, and the copy says so. Fragments and attributions are
     written by a subscriber one outbox delivery after a run finishes, so a
     finished run beside an empty canvas is a TRUE intermediate state about a
     second wide — "assembling", not zero. */
  if (!rootId) {
    return (
      <>
        <PageHead title="Entity canvas" mock={await usingFixtures("entities")}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            Nothing assembled in {workspace.name} yet. Entities are written by a
            subscriber one delivery after a run finishes, so a run that has just
            completed and an empty canvas is a real intermediate state rather
            than a fault — it is assembling.
          </Text>
        </Alert>
      </>
    );
  }

  const canvas = await readCanvas(client, workspace.workspace_id, rootId, {
    limit: limit ? Number(limit) : undefined,
  });

  return (
    <>
      <PageHead title="Entity canvas" mock={await usingFixtures("entities")}>{SUB}</PageHead>
      <EntityCanvas graph={viewOf(canvas)} roots={roots.map(refOf)} />
    </>
  );
}
