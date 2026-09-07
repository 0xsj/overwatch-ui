import type { Metadata } from "next";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { listAssets, listFragments, type Asset, type Fragment } from "@/lib/services/entities";
import { listTargets, type Target } from "@/lib/services/targets";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { AssetTable } from "../_components/asset-table";

const TITLE = "Assets";
const SUB =
  "An asset is a fragment in a role, not a table — a targetable kind carrying an accepted attribution to the target's root entity. Everything else a source said is still a record, and it is on the fragments list below rather than here.";

export const metadata: Metadata = { title: TITLE };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target } = await searchParams;
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            No engagement open. An asset is a claim about a client, so there is
            nothing to list until you are in one.
          </Text>
        </Alert>
      </>
    );
  }

  const client = await clientFor("entities");
  /* TWO endpoints, and the split is the whole of `decisions/0009`.
   *
   *  `/assets` is a VIEW: an accepted attribution to the target's ROOT entity
   *  and a targetable kind. Two of those three conditions cannot be evaluated
   *  in a browser, so fetching `/fragments` and filtering here would be a third
   *  implementation of "is this an asset" — and the one that goes stale. */
  const [assets, fragments, targets]: [Asset[], Fragment[], Target[]] = await Promise.all([
    listAssets(client, workspace.workspace_id, { target }).catch(() => []),
    listFragments(client, workspace.workspace_id).catch(() => []),
    listTargets(await clientFor("targets"), workspace.workspace_id).catch(() => []),
  ]);

  const assetIds = new Set(assets.map((a) => a.fragment_id));
  const unattributed = fragments.filter((f) => !assetIds.has(f.fragment_id));

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("entities")}>{SUB}</PageHead>

      <Panel
        title={target ? "Assets of one target" : `Assets in ${workspace.name}`}
        note="Every row carries the claim that makes it one. `attributed` and `permitted` are two different questions and both are shown — it is theirs, and a tool may touch it."
      >
        {assets.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Nothing attributed yet. Fragments and attributions are written a
            delivery after a run finishes, so a run that has just completed and
            an empty list here is a real intermediate state — it is assembling,
            not zero.
          </Text>
        ) : (
          <AssetTable
            workspaceId={workspace.workspace_id}
            assets={assets}
            targets={targets}
          />
        )}
      </Panel>

      <Panel
        title="Observed, and not an asset"
        note="A fragment nothing attributed is a real record of something a source said. So is a person, or a document — an accepted attribution does not make either an asset, because an asset needs a targetable kind as well."
      >
        {unattributed.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Nothing here. Every fragment observed in this engagement is on the
            list above.
          </Text>
        ) : (
          <AssetTable workspaceId={workspace.workspace_id} fragments={unattributed} />
        )}
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
