import type { Asset } from "./entities.types";

export type RepeatedAssetCluster = {
  kind: Asset["kind"];
  value: string;
  assets: Asset[];
  target_ids: string[];
};

/** Group only exact asset values that are attributed to more than one target.
 *
 * This is intentionally a comparison aid, not an identity resolver: casing,
 * punctuation, aliases, and near matches stay separate. The individual asset
 * rows remain attached so a caller can show every target root and attribution
 * basis that produced the repetition.
 */
export function repeatedAssets(assets: Asset[]): RepeatedAssetCluster[] {
  const groups = new Map<string, RepeatedAssetCluster>();
  for (const asset of assets) {
    const key = `${asset.kind}\u0000${asset.value}`;
    const found = groups.get(key);
    if (found) {
      found.assets.push(asset);
      if (!found.target_ids.includes(asset.target_id)) found.target_ids.push(asset.target_id);
      continue;
    }
    groups.set(key, {
      kind: asset.kind,
      value: asset.value,
      assets: [asset],
      target_ids: [asset.target_id],
    });
  }
  return [...groups.values()]
    .filter((group) => group.target_ids.length > 1)
    .sort((left, right) => right.target_ids.length - left.target_ids.length || left.kind.localeCompare(right.kind) || left.value.localeCompare(right.value));
}
