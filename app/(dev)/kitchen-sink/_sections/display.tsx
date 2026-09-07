import { Badge, Mock, Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function DisplaySection() {
  const sources = await readSources([
    "display/badge/badge.tsx",
    "feedback/alert/alert.tsx",
    "display/stat/stat.tsx",
  ]);
  return (
    <Section id="display" title="Display" blurb="Badge carries a glyph slot because a status may never be distinguished by colour alone — the accent and the healthy state are the same hue here.">
      <Case title="Badge" sources={sources}>
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
      </Case>

      <Case title="Alert" note="a message about the form, not about one field">
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
      </Case>

      <Case title="Stat" note="an unmeasured total is a dash, never a zero" sources={[sources[2]]}>
        <Row label="measured">
          <div className={s.statRow}>
            <Stat label="Accepted" value={8} note="claims somebody ruled on" tone="accent" />
            <Stat label="Proposed" value={5} note="awaiting a decision" tone="warn" />
            <Stat label="Rejected" value={0} note="counted, and there were none" />
          </div>
        </Row>
        <Row label="unmeasured">
          <div className={s.statRow}>
            <Stat label="Never opened" note="nobody has run this count" />
            <Stat label="Coverage" note="omit the prop and the dash is what you get" />
          </div>
        </Row>
        <Row label="why">
          <Text size="xs" tone="quiet">
            The third tile above passes <code>0</code> — somebody counted, and there were none. The
            two below pass nothing. A board showing <code>0</code> for a count nobody ran has told
            you an asset is clean when nothing looked at it, so the honest answer is the one that
            takes fewer keystrokes.
          </Text>
        </Row>
      </Case>

      <Case title="Panel" note="the least opinionated shape here — a border, and somewhere to put a title">
        <Row label="with a head">
          <Panel title="Needs you" note="claims nobody has ruled on" actions={<Badge tone="warn">3</Badge>}>
            <Text size="sm" tone="tertiary">
              The body has padding by default. `title` takes markup, which is why the props type
              omits the DOM&rsquo;s own `title` — leaving both in place makes an intersection that
              only accepts a string.
            </Text>
          </Panel>
        </Row>
        <Row label="bleed">
          <Panel title="Assets" bleed>
            <div className={s.bleedDemo}>a table draws its own edges and wants to meet the border</div>
          </Panel>
        </Row>
      </Case>

      <Case title="Mock" note="yellow, because fixture data is not an error">
        <Row label="badge">
          <Mock />
          <Text as="span" size="xs" tone="quiet">
            hover it, or read it with a screen reader: the full sentence is in a VisuallyHidden
            beside the word, because `title` is not announced and is invisible in a screenshot.
          </Text>
        </Row>
        <Row label="narrower">
          <Mock note="This invitation is a fixture. Nobody sent it, and accepting it creates no account." />
        </Row>
      </Case>
    </Section>
  );
}
