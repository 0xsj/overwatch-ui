import { Badge } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { Panel, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";

export async function DisplaySection() {
  const sources = await readSources(["display/badge/badge.tsx", "feedback/alert/alert.tsx"]);
  return (
    <Section id="display" title="Display" blurb="Badge carries a glyph slot because a status may never be distinguished by colour alone — the accent and the healthy state are the same hue here.">
      <Panel title="Badge" sources={sources}>
        <Row label="tone">
          <Badge>neutral</Badge>
          <Badge tone="accent">accepted</Badge>
          <Badge tone="warn">proposed</Badge>
          <Badge tone="crit">refused</Badge>
          <Badge tone="info">rule</Badge>
        </Row>
        <Row label="glyph">
          <Badge tone="accent" glyph="✓">accepted</Badge>
          <Badge tone="warn" glyph="?">nobody has ruled</Badge>
          <Badge tone="crit" glyph="⊘">out of scope</Badge>
          <Badge glyph="··">never checked</Badge>
        </Row>
        <Row label="mono">
          <Badge mono>run-119</Badge>
          <Badge mono tone="info">art_01JQ8F</Badge>
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
