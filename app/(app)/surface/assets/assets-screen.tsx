"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { assetsQuery, fragmentsQuery, targetsQuery } from "../../_queries";
import { AssetTable } from "../_components/asset-table";

const TITLE = "Assets";
const SUB =
  "An asset is a fragment in a role, not a table — a targetable kind carrying an accepted attribution to the target's root entity. Everything else a source said is still a record, and it is on the fragments list below rather than here.";

export function AssetsScreen() {
  const { workspace } = useContext();
  const target = useSearchParams().get("target") ?? undefined;

  /* TWO endpoints, and the split is the whole of `decisions/0009`.
   *
   *  `/assets` is a VIEW: an accepted attribution to the target's ROOT entity
   *  and a targetable kind. Two of those three conditions cannot be evaluated
   *  in a browser, so fetching `/fragments` and filtering here would be a third
   *  implementation of "is this an asset" — and the one that goes stale. */
  const assets = useQuery({
    queryKey: keys.entities.assets(workspace ?? "", target),
    queryFn: () => assetsQuery(workspace!, target),
    enabled: Boolean(workspace),
  });
  const fragments = useQuery({
    queryKey: keys.entities.fragments(workspace ?? ""),
    queryFn: () => fragmentsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const targets = useQuery({
    queryKey: keys.targets.list(workspace ?? "", false),
    queryFn: () => targetsQuery(workspace!, false),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="An asset" />
      </>
    );
  }

  const assetIds = new Set((assets.data ?? []).map((a) => a.fragment_id));
  const unattributed = (fragments.data ?? []).filter((f) => !assetIds.has(f.fragment_id));

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title={target ? "Assets of one target" : "Assets in this engagement"}
        note="Every row carries the claim that makes it one. `attributed` and `permitted` are two different questions and both are shown — it is theirs, and a tool may touch it."
      >
        <Query of={assets} label="the asset list">
          {(rows) =>
            rows.length === 0 ? (
              <Text size="sm" tone="tertiary">
                Nothing attributed yet. Fragments and attributions are written a
                delivery after a run finishes, so a run that has just completed
                and an empty list here is a real intermediate state — it is
                assembling, not zero.
              </Text>
            ) : (
              <AssetTable
                workspaceId={workspace}
                assets={rows}
                targets={targets.data ?? []}
              />
            )
          }
        </Query>
      </Panel>

      <Panel
        title="Observed, and not an asset"
        note="A fragment nothing attributed is a real record of something a source said. So is a person, or a document — an accepted attribution does not make either an asset, because an asset needs a targetable kind as well."
      >
        <Query of={fragments} label="the fragment list">
          {() =>
            unattributed.length === 0 ? (
              <Text size="sm" tone="tertiary">
                Nothing here. Every fragment observed in this engagement is on
                the list above.
              </Text>
            ) : (
              <AssetTable workspaceId={workspace} fragments={unattributed} />
            )
          }
        </Query>
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          <strong>Reading is not ruling.</strong> Marking a row read records that
          a person looked; a judgement records what they decided. They are two
          calls because they are two acts — and keeping them apart is the whole
          of why <code>READ BY YOU</code> is a check rather than a flag.
        </Text>
      </Alert>
    </>
  );
}
