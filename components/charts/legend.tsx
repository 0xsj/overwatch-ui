import { px } from "./_kernel/scale";
import { divergingFill, sequentialFill, shapePath, type LegendItem } from "./_kernel/encode";
import s from "./legend.module.css";

/** Always present for two or more series, and it carries SHAPE as well as
 *  colour — identity is never colour alone. A single series needs no legend:
 *  the title names it. */
export function Legend({ items, className }: { items: readonly LegendItem[]; className?: string }) {
  if (items.length < 2) return null;
  return (
    <ul className={[s.legend, className].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <li key={item.label}>
          <svg viewBox="-8 -8 16 16" aria-hidden="true" className={s.swatch}>
            <path d={shapePath(item.shape ?? "circle", 5)} style={{ fill: item.fill ?? "var(--chart-grid)" }} />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** The continuous ramp printed beside the marks that use it.
 *
 *  Rendered as discrete steps rather than an SVG gradient, deliberately: a
 *  gradient invites reading a precise value off a smear, and a stepped bar
 *  admits that the eye can resolve about seven levels and no more. */
export function ColourBar({
  kind = "sequential",
  domain,
  midpoint = 0,
  label,
  steps = 9,
  width = 180,
}: {
  kind?: "sequential" | "diverging";
  domain: readonly [number, number];
  midpoint?: number;
  label?: string;
  steps?: number;
  width?: number;
}) {
  const cells = Array.from({ length: steps }, (_, i) => {
    const t = kind === "diverging" ? (i / (steps - 1)) * 2 - 1 : i / (steps - 1);
    return { t, fill: kind === "diverging" ? divergingFill(t) : sequentialFill(t) };
  });
  const cellWidth = width / steps;

  return (
    <figure className={s.bar}>
      <svg viewBox={`0 0 ${px(width)} 22`} className={s.barSvg} aria-hidden="true">
        {cells.map((c, i) => (
          <rect key={i} x={px(i * cellWidth)} y={0} width={px(cellWidth)} height={10} style={{ fill: c.fill }} />
        ))}
        <text className={s.barTick} x={0} y={20}>{fmt(domain[0])}</text>
        {kind === "diverging" ? (
          <text className={s.barTick} x={px(width / 2)} y={20} textAnchor="middle">{fmt(midpoint)}</text>
        ) : null}
        <text className={s.barTick} x={px(width)} y={20} textAnchor="end">{fmt(domain[1])}</text>
      </svg>
      {label ? <figcaption>{label}</figcaption> : null}
    </figure>
  );
}

/** The three kinds of nothing, printed. Any screen using `Matrix` needs this or
 *  the distinction it went to trouble to keep is one the reader cannot decode. */
export function NothingKey() {
  return (
    <ul className={s.legend}>
      <li><span className={s.chipAbsent} aria-hidden="true" />looked, found nothing</li>
      <li><span className={s.chipUnattempted} aria-hidden="true" />never checked</li>
      <li><span className={s.chipNa} aria-hidden="true" />not applicable — excluded from the ratio</li>
    </ul>
  );
}

const fmt = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n * 100) / 100));
