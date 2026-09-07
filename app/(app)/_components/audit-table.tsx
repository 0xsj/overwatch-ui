import Link from "next/link";
import { Badge } from "@/components/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/display";
import { Text } from "@/components/typography";
import type { AuditEntry } from "@/lib/services/ledger";
import s from "./audit-table.module.css";

/** `anonymous` is not a missing value.
 *
 *  A registration arrives unauthenticated, so the row honestly says nobody was
 *  signed in rather than back-filling the account it went on to create.
 *  Rendering it blank reads as data loss; rendering it as the account's name
 *  would be a false claim about who acted. */
function Actor({ actor }: { actor: string }) {
  if (actor === "anonymous") return <span className={s.anon}>not signed in</span>;
  return <span className={s.mono}>{actor.replace(/^user:/, "")}</span>;
}

/** The domain out of a dotted action — `identity.account.created` is identity's.
 *  Shown as a chip so a long ledger is scannable by where the work happened. */
const domainOf = (action: string) => action.split(".")[0] ?? action;

export function AuditTable({
  entries,
  next,
  more,
  empty,
  chainHref,
}: {
  entries: AuditEntry[];
  next?: string;
  /** Where "load more" goes, with `after` already on it. Absent when `next` is
   *  absent, which is the ONLY way to know there is more — there is no total,
   *  by design. */
  more?: (cursor: string) => string;
  /** What an empty ledger means HERE. It differs per screen and the difference
   *  matters: an engagement provisioned at signup has an empty log because
   *  nobody chose to open it, which is not the same as nothing having
   *  happened. */
  empty?: string;
  /** Where a `chain →` link points. The two audit screens live at different
   *  routes and the chain view belongs to one of them. */
  chainHref?: (correlationId: string) => string;
}) {
  if (entries.length === 0) {
    return (
      <Text size="sm" tone="tertiary">
        {empty ?? "Nothing recorded yet. The ledger is written to as work happens."}
      </Text>
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>When</TableHeaderCell>
            <TableHeaderCell>What</TableHeaderCell>
            <TableHeaderCell>Who</TableHeaderCell>
            <TableHeaderCell>Chain</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <span className={s.mono}>{e.occurred_at.slice(0, 19).replace("T", " ")}</span>
              </TableCell>
              <TableCell>
                <div className={s.what}>
                  <span className={s.action}>{e.action}</span>
                  <span className={s.chips}>
                    <Badge tone="neutral" mono>{domainOf(e.action)}</Badge>
                    {/* The scope only when it says something the domain did not.
                        `workspace.created` scoped to `workspace` is two chips
                        carrying one fact, and a row of those trains the eye to
                        skip both. */}
                    {e.scope === domainOf(e.action) ? null : (
                      <Badge tone="neutral" mono>{e.scope}</Badge>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell><Actor actor={e.actor} /></TableCell>
              <TableCell>
                <Link href={(chainHref ?? ((id: string) => `/home/audit-log/${id}`))(e.correlation_id)} className={s.chain}>
                  chain →
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* `next` absent means there is no more. There is no total and no page
          number: the ledger grows at the HEAD, so an offset silently re-shows
          rows above page one and hides rows below it — a failure that looks
          exactly like a correct page. */}
      {next && more ? (
        <Link href={more(next)} className={s.more}>Load more</Link>
      ) : (
        <Text size="xs" tone="quiet">That is everything this far back.</Text>
      )}
    </>
  );
}
