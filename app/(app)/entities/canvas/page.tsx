import type { Metadata } from "next";
import { http } from "@/lib/root";
import { getGraph, getPins, listEntities } from "@/lib/services/entities";
import { PageHead } from "../../_components/page-head";
import { EntityCanvas } from "./_components/entity-canvas";

export const metadata: Metadata = { title: "Canvas" };

const SUB =
  "The node view over entities — one node per fragment, and an edge for every attribution or derivation behind it. The two edge kinds are drawn differently because only one of them is a claim.";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ root?: string; limit?: string }>;
}) {
  const { root, limit } = await searchParams;
  const roots = await listEntities(http);
  const rootId = root ?? roots[0].id;

  const [graph, pins] = await Promise.all([
    getGraph(http, rootId, { limit: limit ? Number(limit) : undefined }),
    getPins(http, rootId),
  ]);

  return (
    <>
      <PageHead title="Entity canvas">{SUB}</PageHead>
      <EntityCanvas graph={graph} roots={roots} pins={pins} />
    </>
  );
}
