import type { ReactNode } from "react";
import type { Scale } from "../_kernel/scale";
import { px } from "../_kernel/scale";
import s from "./plot-frame.module.css";

export type Margin = { top: number; right: number; bottom: number; left: number };

export const DEFAULT_MARGIN: Margin = { top: 14, right: 18, bottom: 38, left: 48 };

export type PlotFrameProps = {
  width: number;
  height: number;
  margin?: Partial<Margin>;
  x?: Scale;
  y?: Scale;
  xLabel?: string;
  yLabel?: string;
  /** Horizontal rules at these y values. A significance cut, a target, a zero
   *  line — the thing the reader is comparing against. */
  rules?: { y?: number; x?: number; label?: string }[];
  grid?: boolean;
  /** Anything drawn inside the plot area. Given in PLOT coordinates: the frame
   *  has already translated past the margin. */
  children?: ReactNode;
  /** Rendered outside the clip, so a tooltip or a direct label can overflow. */
  overlay?: ReactNode;
  title?: string;
  className?: string;
};

/** The frame every statistical chart in this family shares: scales in, axes,
 *  grid, rules, and a plot area for the marks.
 *
 *  # One axis, always
 *
 *  There is no second y-scale and there will not be one. Two measures of
 *  different scale on one frame is the single most common charting mistake —
 *  the crossing point of the two series is an artefact of where the axes were
 *  put, and a reader cannot see that. Two measures means two charts, small
 *  multiples, or indexing both to a common base.
 *
 *  # Why the marks are children and not a prop
 *
 *  A `data` prop would make this component know about every mark type in the
 *  catalogue, and adding a mark would mean editing the frame. As children, the
 *  frame owns the space and the marks own themselves — which is what lets a
 *  volcano plot and a heatmap share it without either knowing the other exists.
 */
export function PlotFrame({
  width,
  height,
  margin: partial,
  x,
  y,
  xLabel,
  yLabel,
  rules,
  grid = true,
  children,
  overlay,
  title,
  className,
}: PlotFrameProps) {
  const m = { ...DEFAULT_MARGIN, ...partial };
  const w = Math.max(1, width - m.left - m.right);
  const h = Math.max(1, height - m.top - m.bottom);

  return (
    <svg
      viewBox={`0 0 ${px(width)} ${px(height)}`}
      width={px(width)}
      height={px(height)}
      className={[s.frame, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      <g transform={`translate(${px(m.left)} ${px(m.top)})`}>
        {grid && y
          ? y.ticks().map((t) => (
              <line
                key={`gy${t}`}
                className={s.grid}
                x1={0}
                x2={px(w)}
                y1={px(y(t))}
                y2={px(y(t))}
              />
            ))
          : null}
        {grid && x
          ? x.ticks().map((t) => (
              <line
                key={`gx${t}`}
                className={s.grid}
                y1={0}
                y2={px(h)}
                x1={px(x(t))}
                x2={px(x(t))}
              />
            ))
          : null}

        {/* Rules sit ABOVE the grid and below the marks: they are a value the
            reader compares against, so they must not be mistaken for grid. */}
        {rules?.map((r, i) =>
          r.y !== undefined && y ? (
            <line key={`ry${i}`} className={s.rule} x1={0} x2={px(w)} y1={px(y(r.y))} y2={px(y(r.y))} />
          ) : r.x !== undefined && x ? (
            <line key={`rx${i}`} className={s.rule} y1={0} y2={px(h)} x1={px(x(r.x))} x2={px(x(r.x))} />
          ) : null,
        )}

        {children}

        {/* Axes last, so a mark at the edge cannot paint over the line the
            reader measures it against. */}
        <line className={s.axis} x1={0} y1={px(h)} x2={px(w)} y2={px(h)} />
        <line className={s.axis} x1={0} y1={0} x2={0} y2={px(h)} />

        {x?.ticks().map((t) => (
          <text key={`tx${t}`} className={s.tick} x={px(x(t))} y={px(h + 15)} textAnchor="middle">
            {format(t)}
          </text>
        ))}
        {y?.ticks().map((t) => (
          <text key={`ty${t}`} className={s.tick} x={-8} y={px(y(t) + 3.5)} textAnchor="end">
            {format(t)}
          </text>
        ))}

        {overlay}
      </g>

      {xLabel ? (
        <text className={s.axisLabel} x={px(m.left + w / 2)} y={px(height - 4)} textAnchor="middle">
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          className={s.axisLabel}
          transform={`translate(11 ${px(m.top + h / 2)}) rotate(-90)`}
          textAnchor="middle"
        >
          {yLabel}
        </text>
      ) : null}
    </svg>
  );
}

/** Short over exact. An axis label is read at a glance and `1.0000000000000002`
 *  is what floating point hands you for a tick that should say `1`. */
function format(n: number): string {
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  if (a >= 10) return n.toFixed(0);
  if (a >= 1) return n.toFixed(1);
  return n.toFixed(2);
}
