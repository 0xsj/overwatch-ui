"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { Query, useContext } from "../../_hooks";
import { canvasQuery, entitiesQuery } from "../../_queries";
import { EntityCanvas } from "./_components/entity-canvas";
import { refOf, viewOf } from "./_layout/graph";

const SUB =
  "The node view over entities — one node per fragment, and an edge for every attribution behind it. The two edge kinds are drawn differently because only one of them is a claim.";

export function CanvasScreen() {
  const { workspace } = useContext();
  const params = useSearchParams();
  const root = params.get("root") ?? undefined;
  const limit = params.get("limit") ?? undefined;

  const rootsQ = useQuery({
    queryKey: keys.entities.list(workspace ?? ""),
    queryFn: () => entitiesQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const roots = rootsQ.data ?? [];
  const rootId = root ?? roots[0]?.entity_id;

  const canvas = useQuery({
    queryKey: keys.entities.canvas(workspace ?? "", rootId ?? "", limit ? Number(limit) : undefined),
    queryFn: () => canvasQuery(workspace!, rootId!, limit ? Number(limit) : undefined),
    enabled: Boolean(workspace && rootId),
  });

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

  /* EVENTUALLY CONSISTENT, and the copy says so. Fragments and attributions are
     written by a subscriber one outbox delivery after a run finishes, so a
     finished run beside an empty canvas is a TRUE intermediate state about a
     second wide — "assembling", not zero. */
  if (!rootsQ.isPending && !rootId) {
    return (
      <>
        <PageHead title="Entity canvas">{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            Nothing assembled here yet. Entities are written by a subscriber one
            delivery after a run finishes, so a run that has just completed and
            an empty canvas is a real intermediate state rather than a fault —
            it is assembling.
          </Text>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHead title="Entity canvas">{SUB}</PageHead>
      <Query of={canvas} label="the canvas">
        {(data) => <EntityCanvas graph={viewOf(data)} roots={roots.map(refOf)} />}
      </Query>
    </>
  );
}
