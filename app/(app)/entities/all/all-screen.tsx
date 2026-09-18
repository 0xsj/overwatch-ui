"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge, Panel, Presence, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { absent, present } from "@/lib/kernel";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, useContext } from "../../_hooks";
import { entitiesQuery, fragmentsQuery } from "../../_queries";
import s from "../../surface/surface.module.css";

const TITLE = "All entities";
const SUB =
  "An entity is identity across sources and time — an argument across many readings rather than a thing one source reported. It is not a fragment, which is why every attribution runs from it to one.";

export function AllEntitiesScreen() {
  const { workspace } = useContext();

  const entitiesQ = useQuery({
    queryKey: keys.entities.list(workspace ?? ""),
    queryFn: () => entitiesQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const fragmentsQ = useQuery({
    queryKey: keys.entities.fragments(workspace ?? ""),
    queryFn: () => fragmentsQuery(workspace!),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="An entity" />
      </>
    );
  }

  const entities = entitiesQ.data ?? [];
  const fragments = fragmentsQ.data ?? [];

  /* A target's ROOT is created by a subscriber on `target.added`, so an entity
     with a `target_id` is somebody's target and one without is assembled. Two
     different things, and the list says which. */
  const roots = entities.filter((e) => e.target_id);
  const assembled = entities.filter((e) => !e.target_id);
  const manual = fragments.filter((f) => f.origin === "manual").length;

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <div className={s.legend}>
        <Stat label="Entities" value={entities.length} note="identities assembled in this engagement" />
        <Stat label="Roots" value={roots.length} note="one per target, written by a subscriber" />
        <Stat label="Fragments" value={fragments.length} note="what sources produced, asset or not" />
        <Stat
          label="Typed in"
          value={manual}
          note={manual ? "manual — nothing has seen these" : "everything here was observed"}
        />
      </div>

      <Panel
        title="Entities"
        note="Opening one draws its canvas. The root is never among the nodes — it is not a fragment, and every edge runs from it to one."
      >
        {entities.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Nothing assembled yet. Entities are written by a subscriber one
            delivery after a run finishes, so a run that has just completed and
            an empty list here is a true intermediate state — it is assembling,
            not zero.
          </Text>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">kind</th>
                  <th scope="col">label</th>
                  <th scope="col">what it is</th>
                  <th scope="col">judgement</th>
                </tr>
              </thead>
              <tbody>
                {[...roots, ...assembled].map((e) => (
                  <tr key={e.entity_id}>
                    <td><Badge mono>{e.kind}</Badge></td>
                    <td>
                      <Link href={`/entities/canvas?root=${encodeURIComponent(e.entity_id)}`}>
                        {e.label}
                      </Link>
                    </td>
                    <td className={s.quiet}>
                      {e.target_id ? "a target's root" : "assembled from fragments"}
                    </td>
                    <td>
                      <Badge tone={e.judgement.state === "unopened" ? "neutral" : "accent"} mono>
                        {e.judgement.state}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Fragments"
        note="An identifier a source produced — or a person typed. It IS the tuple (workspace, kind, value), deduped. A fragment is not an asset: that needs an accepted attribution and a targetable kind as well."
      >
        {fragments.length === 0 ? (
          <Text size="sm" tone="tertiary">Nothing observed yet.</Text>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">kind</th>
                  <th scope="col">value</th>
                  <th scope="col">origin</th>
                  <th scope="col" className={s.num}>observations</th>
                  <th scope="col">read</th>
                </tr>
              </thead>
              <tbody>
                {fragments.map((f) => (
                  <tr key={f.fragment_id}>
                    <td className={s.quiet}>{f.kind}</td>
                    <td className={s.value}>{f.value}</td>
                    <td className={s.quiet}>{f.origin}</td>
                    <td className={s.num}>{f.observations}</td>
                    <td>
                      {/* A human READ, and NOT the judgement. Absent means
                          nobody looked, which is a different fact from nobody
                          having ruled. */}
                      <Presence of={f.read_at ? present("read") : absent()} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
