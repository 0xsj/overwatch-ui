import { Alert, Chip } from "@/components/display";
import { Text } from "@/components/typography";
import { Panel, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";

export async function DisplaySection() {
  const sources = await readSources(["display/chip/chip.tsx", "display/alert/alert.tsx"]);
  return (
    <Section id="display" title="Display" blurb="Chip carries a glyph slot because a status may never be distinguished by colour alone — the accent and the healthy state are the same hue here.">
      <Panel title="Chip" sources={sources}>
        <Row label="tone">
          <Chip>neutral</Chip>
          <Chip tone="accent">accepted</Chip>
          <Chip tone="warn">proposed</Chip>
          <Chip tone="crit">refused</Chip>
          <Chip tone="info">rule</Chip>
        </Row>
        <Row label="glyph">
          <Chip tone="accent" glyph="✓">accepted</Chip>
          <Chip tone="warn" glyph="?">nobody has ruled</Chip>
          <Chip tone="crit" glyph="⊘">out of scope</Chip>
          <Chip glyph="··">never checked</Chip>
        </Row>
        <Row label="mono">
          <Chip mono>run-119</Chip>
          <Chip mono tone="info">art_01JQ8F</Chip>
        </Row>
      </Panel>

      <Panel title="Alert" note="a message about the form, not about one field">
        <Row label="tone">
          <Alert live={false}>
            <Text size="sm">A neutral note. No role, no live region — this one is furniture.</Text>
          </Alert>
        </Row>
        <Row label="crit">
          <Alert tone="crit">
            <Text size="sm">Those credentials do not match an account. Check both, then try again.</Text>
          </Alert>
        </Row>
        <Row label="warn">
          <Alert tone="warn">
            <Text size="sm"><strong>This build has no backend.</strong> Nothing is stored.</Text>
          </Alert>
        </Row>
        <Row label="glyph">
          <Alert tone="info" glyph="✉">
            <Text size="sm">Nothing was sent. A real build would answer the same way either way.</Text>
          </Alert>
        </Row>
      </Panel>
    </Section>
  );
}
