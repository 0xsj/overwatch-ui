import { band, px } from "./_kernel/scale";
import { divergingFill, sequentialFill } from "./_kernel/encode";
import s from "./marks.module.css";

/** A cell, and the union is the whole reason this component exists.
 *
 *  Every charting library models a matrix cell as `number | null` and renders
 *  `null` as a gap. This product cannot: §Scope refuses to collapse
 *  `never checked` against `found nothing`, and `decisions/0011` adds a third —
 *  `not applicable`, which is excluded from BOTH halves of a coverage ratio
 *  because it is not a pair. An ASN has no TLS certificate; that is not a gap in
 *  the data, it is the absence of a question.
 *
 *  Four states, drawn four ways, and none of them is an empty cell. */
export type Cell =
  | { state: "value"; value: number }
  /** Looked, and there was nothing. A measured zero. */
  | { state: "absent" }
  /** Nobody asked. Not the same as a zero and never rendered as one. */
  | { state: "unattempted" }
  /** There is no question to ask here. Excluded from the ratio entirely. */
  | { state: "na" };

export type MatrixProps = {
  rows: readonly string[];
  columns: readonly string[];
  cell: (row: string, column: string) => Cell;
  width?: number;
  height?: number;
  /** `diverging` is signed about a midpoint; `sequential` is magnitude only. */
  ramp?: "diverging" | "sequential";
  /** Only for `diverging`. */
  midpoint?: number;
  extent?: number;
  title?: string;
  onSelect?: (row: string, column: string) => void;
};

export function Matrix({
  rows,
  columns,
  cell,
  width = 520,
  height,
  ramp = "sequential",
  midpoint = 0,
  extent,
  title,
  onSelect,
}: MatrixProps) {
  const m = { top: 8, right: 8, bottom: 76, left: 128 };
  const w = Math.max(1, width - m.left - m.right);
  const cellSize = Math.max(8, w / Math.max(1, columns.length));
  const h = cellSize * rows.length;
  const total = height ?? h + m.top + m.bottom;

  const x = band(columns, [0, w], 0.06);
  const y = band(rows, [0, h], 0.06);

  const span =
    extent ??
    Math.max(
      1e-9,
      ...rows.flatMap((r) =>
        columns.map((c) => {
          const v = cell(r, c);
          return v.state === "value" ? Math.abs(v.value - midpoint) : 0;
        }),
      ),
    );

  return (
    <svg viewBox={`0 0 ${px(width)} ${px(total)}`}
      width={px(width)}
      height={px(total)} className={s.matrix} role="img" aria-label={title}>
      {title ? <title>{title}</title> : null}
      <g transform={`translate(${px(m.left)} ${px(m.top)})`}>
        {rows.map((r) =>
          columns.map((c) => {
            const v = cell(r, c);
            const fill =
              v.state !== "value"
                ? undefined
                : ramp === "diverging"
                  ? divergingFill((v.value - midpoint) / span)
                  : sequentialFill((v.value - midpoint) / span);
            return (
              <rect
                key={`${r}|${c}`}
                className={s.cell}
                data-state={v.state}
                x={px(x(c))}
                y={px(y(r))}
                width={px(x.bandWidth)}
                height={px(y.bandWidth)}
                style={fill ? { fill } : undefined}
                onClick={onSelect ? () => onSelect(r, c) : undefined}
              >
                <title>{`${r} · ${c} — ${describe(v)}`}</title>
              </rect>
            );
          }),
        )}

        {/* `unattempted` gets a dotted outline rather than a fill, because it is
            the one state that is genuinely empty — and an empty cell with no
            mark at all is indistinguishable from a rendering failure. */}
        {rows.map((r) =>
          columns.map((c) =>
            cell(r, c).state === "unattempted" ? (
              <rect
                key={`u${r}|${c}`}
                className={s.unattempted}
                x={px(x(c) + 0.5)}
                y={px(y(r) + 0.5)}
                width={px(x.bandWidth - 1)}
                height={px(y.bandWidth - 1)}
              />
            ) : null,
          ),
        )}

        {/* `na` gets a diagonal slash — a texture, so it survives being printed
            and is never mistaken for a low value. */}
        {rows.map((r) =>
          columns.map((c) =>
            cell(r, c).state === "na" ? (
              <line
                key={`n${r}|${c}`}
                className={s.na}
                x1={px(x(c) + 2)}
                y1={px(y(r) + y.bandWidth - 2)}
                x2={px(x(c) + x.bandWidth - 2)}
                y2={px(y(r) + 2)}
              />
            ) : null,
          ),
        )}

        {rows.map((r) => (
          <text key={`r${r}`} className={s.matrixLabel} x={-6} y={px(y(r) + y.bandWidth / 2 + 3)} textAnchor="end">
            {r}
          </text>
        ))}
        {columns.map((c) => (
          <text
            key={`c${c}`}
            className={s.matrixLabel}
            transform={`translate(${px(x(c) + x.bandWidth / 2)} ${px(h + 6)}) rotate(-42)`}
            textAnchor="end"
          >
            {c}
          </text>
        ))}
      </g>
    </svg>
  );
}

function describe(c: Cell): string {
  switch (c.state) {
    case "value": return String(c.value);
    case "absent": return "looked, found nothing";
    case "unattempted": return "never checked";
    case "na": return "not applicable — no question to ask";
  }
}

/** The coverage ratio, which is the reason the `na` state exists.
 *
 *  `decisions/0011`: a cell that does not apply is excluded from the numerator
 *  AND the denominator. Counting it as a miss makes coverage look worse the more
 *  kinds of asset a firm has; counting it as a hit makes it look better. It is
 *  neither, and the only correct answer is to leave it out of the fraction.
 *
 *  Returns `null` when nothing applies, because a ratio over nothing is not
 *  zero — §Scope: an unmeasured total renders as `–` and never as `0`. */
export function coverageOf(
  rows: readonly string[],
  columns: readonly string[],
  cell: (row: string, column: string) => Cell,
): { checked: number; applicable: number; ratio: number } | null {
  let checked = 0;
  let applicable = 0;
  for (const r of rows)
    for (const c of columns) {
      const v = cell(r, c);
      if (v.state === "na") continue;
      applicable++;
      if (v.state === "value" || v.state === "absent") checked++;
    }
  return applicable === 0 ? null : { checked, applicable, ratio: checked / applicable };
}
