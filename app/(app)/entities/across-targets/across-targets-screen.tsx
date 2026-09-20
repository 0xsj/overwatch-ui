"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Panel, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { repeatedAssets, type Asset } from "@/lib/services/entities";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { assetsQuery, targetsQuery } from "../../_queries";
import s from "../../surface/surface.module.css";

const SUB =
  "Exact asset values attributed to more than one target root in this engagement. This is a comparison lead, not an identity decision or a claim that the targets share ownership.";

export function AcrossTargetsScreen() {
  const { workspace } = useContext();
  const assets = useQuery({
    queryKey: keys.entities.assets(workspace ?? ""),
    queryFn: () => assetsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const targets = useQuery({
    queryKey: keys.targets.list(workspace ?? "", true),
    queryFn: () => targetsQuery(workspace!, true),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return <><PageHead title="Across targets">{SUB}</PageHead><NoWorkspace what="A cross-target comparison" /></>;
  }

  return <>
    <PageHead title="Across targets">{SUB}</PageHead>
    <Query of={assets} label="cross-target assets">{(assetRows) => <Query of={targets} label="target names">{(targetRows) => {
      const clusters = repeatedAssets(assetRows);
      const targetByID = new Map(targetRows.map((target) => [target.target_id, target]));
      const targetCount = new Set(clusters.flatMap((cluster) => cluster.target_ids)).size;
      return <>
        <div className={s.legend}>
          <Stat label="Repeated values" value={clusters.length} note="exact kind and value matches" />
          <Stat label="Targets involved" value={targetCount} note="target roots represented in those matches" />
          <Stat label="Asset occurrences" value={clusters.reduce((sum, cluster) => sum + cluster.assets.length, 0)} note="accepted attributions retained separately" />
        </div>
        <Panel title="Repeated exact values" note="Every occurrence keeps its target, root entity, attribution, and basis. Nothing is merged or rewritten.">
          {clusters.length === 0 ? <div className={s.empty}>
            <Text size="sm">No exact asset value currently appears under more than one target.</Text>
            <Text size="sm" tone="tertiary">This view only compares accepted, targetable asset rows. Near matches and identity hypotheses belong in human review, not in this list.</Text>
          </div> : <div className={s.eventList}>{clusters.map((cluster) => <RepeatedAssetCard key={`${cluster.kind}:${cluster.value}`} cluster={cluster} targetByID={targetByID} />)}</div>}
        </Panel>
        <Text size="xs" tone="tertiary">A repeated value is a lead for comparison. It does not resolve research records, change attribution, or create a relationship between targets.</Text>
      </>;
    }}</Query>}</Query>
  </>;
}

function RepeatedAssetCard({ cluster, targetByID }: { cluster: ReturnType<typeof repeatedAssets>[number]; targetByID: Map<string, { target_id: string; name: string; archived: boolean }> }) {
  return <article className={s.observation}>
    <div className={s.eventMeta}><Badge mono>{cluster.kind}</Badge><strong className={s.eventTitle}>{cluster.value}</strong><Badge tone="warn">{cluster.target_ids.length} targets</Badge></div>
    <Text size="xs" tone="tertiary">Exact value repeated across accepted attributions. Review each target independently.</Text>
    <div className={s.stack}>{cluster.assets.map((asset) => <AssetOccurrence key={`${asset.target_id}:${asset.fragment_id}:${asset.attribution_id}`} asset={asset} target={targetByID.get(asset.target_id)} />)}</div>
  </article>;
}

function AssetOccurrence({ asset, target }: { asset: Asset; target?: { target_id: string; name: string; archived: boolean } }) {
  return <div className={s.sourceCard}>
    <div className={s.row}>
      <Link className={s.inlineLink} href={`/entities/canvas?root=${encodeURIComponent(asset.root_entity_id)}`}>{target?.name ?? asset.target_id}</Link>
      {target?.archived ? <Badge tone="neutral">Archived target</Badge> : null}
      <span className={s.muted}>{asset.observations} observation{asset.observations === 1 ? "" : "s"} · {asset.origin}</span>
    </div>
    <Text size="xs" tone="tertiary">Root {asset.root_entity_id} · attribution {asset.attribution_id}</Text>
    <Text size="xs" tone="tertiary">Basis: {asset.basis}</Text>
  </div>;
}
