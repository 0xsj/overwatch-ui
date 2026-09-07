import Link from "next/link";
import s from "./facet-row.module.css";

/** The facet counts, rendered AS GIVEN.
 *
 *  The counts deliberately ignore the filter: click `scope` and every other
 *  facet keeps its real total. That is what lets a reader leave a facet they
 *  have entered — counting the filtered set would show every other bucket as
 *  zero, and a row that hides zero-count buckets would then remove the way back
 *  from the page. So this never recomputes anything from the visible entries.
 *
 *  It also arrives with the FIRST page only, because it describes the whole set
 *  and does not change as you page. The caller keeps the ones it has rather than
 *  reading an absence as "no facets". */
export function FacetRow({
  facets,
  active,
  href,
}: {
  facets: { facet: string; total: number }[];
  active?: string;
  /** Where a facet leads. `undefined` clears the filter. */
  href: (facet?: string) => string;
}) {
  if (facets.length === 0) return null;

  return (
    <div className={s.row}>
      <Link href={href()} className={s.chip} data-active={active ? undefined : true}>
        everything
      </Link>
      {facets.map((f) => (
        <Link
          key={f.facet}
          href={href(f.facet)}
          className={s.chip}
          data-active={f.facet === active || undefined}
        >
          {f.facet}
          <span className={s.count}>{f.total}</span>
        </Link>
      ))}
    </div>
  );
}
