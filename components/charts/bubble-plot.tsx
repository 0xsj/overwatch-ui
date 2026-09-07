import { PlotFrame } from "./plot-frame";
import { extentOf, linear, pad, px } from "./_kernel/scale";
import { categorical, radiusFor } from "./_kernel/encode";
import s from "./marks.module.css";

export type Bubble = {
  id: string;
  x: number;
  y: number;
  /** Mapped to AREA, not radius. */
  weight: number;
  category?: string;
  label?: string;
};

export function BubblePlot({
  bubbles,
  width = 460,
  height = 320,
  xLabel,
  yLabel,
  categories,
  title,
}: {
  bubbles: readonly Bubble[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  /** Fixed order. Assigning hue by first-seen would repaint the survivors when
   *  a filter changes what is present. */
  categories?: readonly string[];
  title?: string;
}) {
  const m = { top: 14, right: 22, bottom: 38, left: 48 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;

  const x = linear(pad(extentOf(bubbles.map((b) => b.x))), [0, w]);
  const y = linear(pad(extentOf(bubbles.map((b) => b.y))), [h, 0]);
  const weights = extentOf(bubbles.map((b) => b.weight));
  const order = categories ?? [...new Set(bubbles.map((b) => b.category ?? ""))];

  return (
    <PlotFrame width={width} height={height} margin={m} x={x} y={y} xLabel={xLabel} yLabel={yLabel} title={title}>
      {bubbles.map((b) => (
        <circle
          key={b.id}
          className={s.bubble}
          cx={px(x(b.x))}
          cy={px(y(b.y))}
          r={px(radiusFor(b.weight, weights))}
          style={{ fill: categorical(order.indexOf(b.category ?? "")) ?? "var(--chart-grid)" }}
        >
          <title>{`${b.label ?? b.id} · ${b.weight}`}</title>
        </circle>
      ))}
    </PlotFrame>
  );
}
