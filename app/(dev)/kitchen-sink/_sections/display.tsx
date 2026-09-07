import {
  Avatar,
  Badge,
  Empty,
  Mock,
  Panel,
  Presence,
  Stat,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/display";
import { Skeleton } from "@/components/feedback";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { absent, present, unattempted } from "@/lib/kernel";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function DisplaySection() {
  const sources = await readSources([
    "display/badge/badge.tsx",
    "feedback/alert/alert.tsx",
    "display/stat/stat.tsx",
    "display/presence/presence.tsx",
    "display/table/table.tsx",
    "display/empty/empty.tsx",
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

      <Case
        title="Presence"
        note="the two states that look alike are the two that must not"
        sources={[sources[3]]}
      >
        <Row label="states">
          <Presence of={present("nginx/1.24.0")} />
          <Presence of={absent()} />
          <Presence of={unattempted()} />
        </Row>
        <Row label="in a column">
          <table className={s.presenceTable}>
            <tbody>
              {[
                ["assets.northbeam.example", present("TLS 1.3"), present("443, 80")],
                ["legacy.northbeam.example", absent(), present("22")],
                ["northbeam-cdn.example", unattempted(), unattempted()],
                ["198.51.100.12", present("TLS 1.2"), absent()],
              ].map(([host, tls, ports]) => (
                <tr key={String(host)}>
                  <td className={s.presenceHost}>{String(host)}</td>
                  <td><Presence of={tls as never} /></td>
                  <td><Presence of={ports as never} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Row>
        <Row label="compact">
          <Presence of={present("TLS 1.3")} compact />
          <Presence of={absent()} compact />
          <Presence of={unattempted()} compact />
          <Text as="span" size="xs" tone="quiet">
            glyph only for a dense table — the word moves into hidden text rather than being
            dropped, so a screen reader still hears &ldquo;none&rdquo; or &ldquo;never checked&rdquo;.
          </Text>
        </Row>
        <Row label="why">
          <Text size="xs" tone="quiet">
            Squint, or print it in greyscale. <strong>absent</strong> and{" "}
            <strong>unattempted</strong> are still tellable apart — different glyph, different word,
            and one is italic with a dotted rule under it. Two greys would be two greys, and a
            screen that renders them the same has said an asset is clean when nothing looked at it.
          </Text>
        </Row>
      </Case>

      <Case
        title="Table"
        note="a composite is demonstrated by its STATES, not its variants"
        sources={[sources[4]]}
      >
        <Row label="rows">
          <Table stickyHead>
            <TableCaption>Members of 31m</TableCaption>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Member</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Last seen</TableHeaderCell>
                <TableHeaderCell numeric>Claims</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["S. Jarratt", "Owner", present("3 d ago"), 41],
                ["R. Deng", "Analyst", present("8 min ago"), 9],
                ["M. Okafor", "Client", unattempted(), 0],
              ].map(([name, role, seen, claims]) => (
                <TableRow key={String(name)}>
                  <TableCell>
                    <span className={s.member}>
                      <Avatar name={String(name)} />
                      {String(name)}
                    </span>
                  </TableCell>
                  <TableCell><Badge mono>{String(role)}</Badge></TableCell>
                  <TableCell><Presence of={seen as never} /></TableCell>
                  <TableCell numeric>{String(claims)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Row>

        <Row label="loading">
          <Table>
            <TableCaption>Loading members</TableCaption>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Member</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell numeric>Claims</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {["72%", "58%", "81%"].map((w, i) => (
                <TableRow key={w}>
                  <TableCell><Skeleton width={w} /></TableCell>
                  <TableCell><Skeleton width="40%" /></TableCell>
                  <TableCell numeric><Skeleton width={`${20 + i * 6}%`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Row>

        <Row label="why states">
          <Text size="xs" tone="quiet">
            A primitive panel shows variants — tone, size, shape. A composite goes wrong in its{" "}
            <strong>states</strong>, so those are what a panel has to show: loading, empty,
            empty-because-nothing-measured, one row, many, and every column absent. The bar widths
            above differ on purpose; identical bars read as a pattern rather than as text that has
            not arrived.
          </Text>
        </Row>
      </Case>

      <Case title="Empty" note="two of these are results and one is not" sources={[sources[5]]}>
        <Row label="empty">
          <Empty reason="empty" headline="Nothing is waiting on you.">
            Every claim on this target has been ruled on.
          </Empty>
        </Row>
        <Row label="filtered">
          <Empty reason="filtered" headline="Nothing matches that filter.">
            Three rules are excluding 41 assets. Clearing them would show all of them.
          </Empty>
        </Row>
        <Row label="unmeasured">
          <Empty reason="unmeasured" headline="Coverage has never been computed for this target.">
            No check has run, so there is no denominator and nothing to be empty of.
          </Empty>
        </Row>
        <Row label="why">
          <Text size="xs" tone="quiet">
            An empty table is exactly where somebody concludes &ldquo;we&rsquo;re clean&rdquo;. The
            first two are results — something looked and there was nothing. The third is not:
            nobody looked. <code>reason</code> is required and has no default, because the whole
            component is that distinction and a default would let a caller skip making it.
          </Text>
        </Row>
      </Case>

      <Case title="Avatar" note="initials derived in one place, so two callers cannot disagree">
        <Row label="sizes">
          <Avatar name="S. Jarratt" size="sm" />
          <Avatar name="S. Jarratt" size="md" />
          <Avatar name="S. Jarratt" size="lg" />
        </Row>
        <Row label="names">
          <Avatar name="S. Jarratt" size="md" />
          <Avatar name="R. Deng" size="md" />
          <Avatar name="Mary-Jane Okafor" size="md" />
          <Avatar name="cron" size="md" />
          <Text as="span" size="xs" tone="quiet">
            one name gives one letter, not two of the same. The sidebar used to derive these itself.
          </Text>
        </Row>
      </Case>
    </Section>
  );
}
