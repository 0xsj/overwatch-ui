"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Attribution, Fragment } from "@/lib/services/entities";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { canvasQuery, entitiesQuery } from "../../_queries";
import { ReviewQueue } from "../_components/review-queue";
import s from "../surface.module.css";

const TITLE = "Attributions";
const SUB =
  "A claim that a fragment belongs to an entity, naming who proposed it. Accepting one puts something on a client's asset list, which is why it needs admin rather than write — and it never rewrites who made the claim.";

export function AttributionsScreen() {
  const { workspace } = useContext();
  const root = useSearchParams().get("root") ?? undefined;

  const roots = useQuery({
    queryKey: keys.entities.list(workspace ?? ""),
    queryFn: () => entitiesQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const chosen = root ?? roots.data?.[0]?.entity_id;

  /* ONE canvas, for the root being reviewed — not one per root.
   *
   *  This screen used to pull every root's entire canvas and discard
   *  everything that was not `proposed`: a review queue assembled by fetching
   *  the whole graph N times, where N grows with the engagement. There is no
   *  "every proposed attribution here" read on the wire, so the honest client
   *  answer is to review one root at a time and say so, rather than to pay for
   *  all of them and throw most of it away.
   *
   *  The endpoint that would make this one list is filed in `ALIGNMENT.md`. */
  const canvas = useQuery({
    queryKey: [...keys.entities.canvas(workspace ?? "", chosen ?? ""), "review"],
    queryFn: () => canvasQuery(workspace!, chosen!),
    enabled: Boolean(workspace && chosen),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="An attribution" />
      </>
    );
  }

  const proposed: { fragment: Fragment; edge: Attribution; root: string }[] = (
    canvas.data?.nodes ?? []
  )
    .filter((node) => node.edge.state === "proposed")
    .map((node) => ({
      fragment: node as Fragment,
      edge: node.edge,
      root: canvas.data?.root.label ?? "an entity",
    }));

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Query of={roots} label="the entity list">
        {(all) =>
          all.length === 0 ? (
            <Text size="sm" tone="tertiary">
              Nothing assembled here yet, so there is nothing to have claimed.
            </Text>
          ) : (
            <div className={s.cells}>
              {all.map((e) => (
                <Link
                  key={e.entity_id}
                  href={`/surface/attributions?root=${encodeURIComponent(e.entity_id)}`}
                >
                  <Badge tone={e.entity_id === chosen ? "accent" : "neutral"} mono>
                    {e.label}
                  </Badge>
                </Link>
              ))}
            </div>
          )
        }
      </Query>

      <Panel
        title={canvas.data ? `Waiting on you for ${canvas.data.root.label}` : "Waiting on a decision"}
        note="One root at a time. Only a model proposes — a human and a rule are born accepted, because a rule's assignment is a category rather than a probability and there is nothing to agree with."
      >
        <Query of={canvas} label="the claims">
          {() =>
            proposed.length === 0 ? (
              <Text size="sm" tone="tertiary">
                Nothing is waiting here. That is the ordinary state: nothing in
                this product proposes an attribution today except a model, and no
                model is wired to it — the queue exists because it is what makes a
                model&rsquo;s claims safe to accept at all, not because something
                is producing them.
              </Text>
            ) : (
              <ReviewQueue workspaceId={workspace} rows={proposed} />
            )
          }
        </Query>
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          <strong>Deciding never rewrites the claimant.</strong> Who proposed it
          stays who proposed it, and accepting writes a decider beside that rather
          than over it. A rule decides without a person, so an accepted claim with
          no decider is not a missing field — it means no person ruled.
        </Text>
      </Alert>
    </>
  );
}
