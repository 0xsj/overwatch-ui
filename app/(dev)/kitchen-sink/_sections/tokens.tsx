import { Text } from "@/components/typography";
import { Chip } from "@/components/display";
import { Panel, Row, Section } from "../_components/section";
import { audit, type Check } from "../_lib/tokens";
import s from "../_components/sink.module.css";

const SWATCHES = ["--accent", "--accent-dim", "--fill", "--warn", "--crit", "--info"];
const SURFACES = ["--surface-ground", "--surface-rail", "--surface-sunk",
  "--surface-panel", "--surface-panel-2", "--surface-raised"];
const INK = ["--ink", "--ink-2", "--ink-3", "--ink-4"];

function Audit({ rows, theme }: { rows: Check[]; theme: string }) {
  const failed = rows.filter((r) => !r.pass).length;
  return (
    <div>
      <Row label={theme}>
        <Chip tone={failed ? "crit" : "accent"} glyph={failed ? "✕" : "✓"}>
          {failed ? `${failed} below threshold` : `${rows.length} pairs pass`}
        </Chip>
      </Row>
      <table className={s.audit}>
        <thead><tr><th>Foreground</th><th>On</th><th>Ratio</th><th>Needs</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.fg}-${r.bg}`}>
              <td>{r.fg}</td>
              <td>{r.bg}</td>
              <td className={r.pass ? s.pass : s.fail}>{r.ratio.toFixed(2)}:1</td>
              <td className={s.pass}>{r.large ? "3.00" : "4.50"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function TokensSection() {
  const checks = await audit();
  return (
    <Section
      id="tokens"
      title="Tokens"
      blurb="Every value a component may read. The audit below is computed from the stylesheet at build time — this page fails visibly when a token stops clearing its contrast threshold, which is the failure that survived two visual reviews before it was measured."
    >
      <Panel title="Contrast audit" note="computed from styles/tokens/*.css">
        <Audit rows={checks.dark} theme="dark" />
        <Audit rows={checks.light} theme="light" />
      </Panel>

      <Panel title="Ink" note="monotonic in prominence in both themes">
        {INK.map((t) => (
          <Row key={t} label={t}>
            <Text as="span" style={{ color: `var(${t})` }}>
              A source said something. That is all that is ever held.
            </Text>
          </Row>
        ))}
      </Panel>

      <Panel title="Surfaces">
        <div className={s.swatches}>
          {SURFACES.map((t) => (
            <div key={t} className={s.swatch}>
              <div className={s.swatchChip} style={{ background: `var(${t})` }} />
              <div className={s.swatchLabel}>{t}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Accent and status" note="the accent is also the healthy state, so nothing is hue alone">
        <div className={s.swatches}>
          {SWATCHES.map((t) => (
            <div key={t} className={s.swatch}>
              <div className={s.swatchChip} style={{ background: `var(${t})` }} />
              <div className={s.swatchLabel}>{t}</div>
            </div>
          ))}
        </div>
        <Row label="three states">
          <Chip glyph="●" tone="accent">found</Chip>
          <Chip glyph="—">none</Chip>
          <Chip glyph="··">never checked</Chip>
        </Row>
      </Panel>
    </Section>
  );
}
