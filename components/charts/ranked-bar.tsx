import { PlotFrame } from "./plot-frame";
import { band, linear, px } from "./_kernel/scale";
import s from "./marks.module.css";

export type Bar = { id: string; label: string; value: number };

export function RankedBar({
  bars,
  width = 460,
  height = 280,
  yLabel,
  title,
}: {
  bars: readonly Bar[];
  width?: number;
  height?: number;
  yLabel?: string;
  title?: string;
}) {
  // Sorted here rather than expecting a sorted input: the ORDER is the finding,
  // so it is the chart's job and not the caller's.
  const sorted = [...bars].sort((a, b) => b.value - a.value);
  const m = { top: 14, right: 14, bottom: 52, left: 44 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;

  const x = band(sorted.map((b) => b.label), [0, w], 0.28);
  // Bars are ALWAYS measured from zero. A truncated bar axis exaggerates a
  // difference by however much was cut off, and the reader cannot see it.
  const y = linear([0, Math.max(...sorted.map((b) => b.value), 1)], [h, 0]);

  return (
    <PlotFrame width={width} height={height} margin={m} y={y} yLabel={yLabel} title={title} grid>
      {sorted.map((b) => (
        <g key={b.id}>
          <rect
            className={s.bar}
            x={px(x(b.label))}
            y={px(y(b.value))}
            width={px(x.bandWidth)}
            height={px(h - y(b.value))}
            rx={3}
          >
            <title>{`${b.label} · ${b.value}`}</title>
          </rect>
          {/* Direct labels, because ten bars with an axis is ten lookups. */}
          <text className={s.barValue} x={px(x(b.label) + x.bandWidth / 2)} y={px(y(b.value) - 5)} textAnchor="middle">
            {b.value}
          </text>
          <text
            className={s.barLabel}
            transform={`translate(${px(x(b.label) + x.bandWidth / 2)} ${px(h + 12)}) rotate(-38)`}
            textAnchor="end"
          >
            {b.label}
          </text>
        </g>
      ))}
    </PlotFrame>
  );
}
