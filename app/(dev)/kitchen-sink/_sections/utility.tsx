import { Badge } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import {
  AccessibleIcon,
  Activity,
  ArrowUpRight,
  Building2,
  ChartColumn,
  House,
  LoaderCircle,
  Monitor,
  Moon,
  PanelLeft,
  Portal,
  Settings,
  Sun,
  Table2,
  Target,
  Trash2,
  VisuallyHidden,
  Waypoints,
  Wrench,
} from "@/components/utility";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

/* Every name the module exports. Listed here rather than derived, so the panel
   is a CLAIM about the set that goes stale visibly when the set changes. */
const SET = [
  { name: "Activity", Icon: Activity },
  { name: "ArrowUpRight", Icon: ArrowUpRight },
  { name: "Building2", Icon: Building2 },
  { name: "ChartColumn", Icon: ChartColumn },
  { name: "House", Icon: House },
  { name: "LoaderCircle", Icon: LoaderCircle },
  { name: "Monitor", Icon: Monitor },
  { name: "Moon", Icon: Moon },
  { name: "PanelLeft", Icon: PanelLeft },
  { name: "Settings", Icon: Settings },
  { name: "Sun", Icon: Sun },
  { name: "Table2", Icon: Table2 },
  { name: "Target", Icon: Target },
  { name: "Trash2", Icon: Trash2 },
  { name: "Waypoints", Icon: Waypoints },
  { name: "Wrench", Icon: Wrench },
];

export async function UtilitySection() {
  const sources = await readSources([
    "utility/visually-hidden/visually-hidden.tsx",
    "utility/accessible-icon/accessible-icon.tsx",
    "utility/icon/icon.ts",
  ]);

  return (
    <Section
      id="utility"
      title="Utility"
      blurb="Four components with no appearance of their own. That makes them the hardest thing to put in a showcase — so each panel below demonstrates what it DOES rather than what it looks like."
    >
      <Case
        title="VisuallyHidden"
        note="there is a whole sentence between these two words"
        sources={[sources[0]]}
      >
        <Row label="in the tree">
          <Text size="sm">
            This target has{" "}
            <VisuallyHidden>
              an unmeasured number of — and this clause is the point: it is read aloud, it is
              selectable, and it occupies no space —
            </VisuallyHidden>{" "}
            assets.
          </Text>
        </Row>
        <Row label="proof">
          <Text size="xs" tone="quiet">
            Select the line above with a cursor drag and the hidden clause comes with it. It is a
            1px clipped box, not <code>display: none</code> — which would have removed it from the
            accessibility tree, and removing it from that tree is the one thing this component must
            never do.
          </Text>
        </Row>
      </Case>

      <Case
        title="AccessibleIcon"
        note="the label is what the icon MEANS, never what it depicts"
        sources={[sources[1]]}
      >
        <Row label="named">
          <Button size="icon" aria-label="Delete this scope rule">
            <AccessibleIcon label="Delete this scope rule"><Trash2 size={14} /></AccessibleIcon>
          </Button>
          <Text as="span" size="xs" tone="quiet">
            announced as <strong>&ldquo;Delete this scope rule&rdquo;</strong> — not &ldquo;wastebasket&rdquo;
          </Text>
        </Row>
        <Row label="decorative">
          <Badge tone="accent" glyph="✓">accepted</Badge>
          <Text as="span" size="xs" tone="quiet">
            no AccessibleIcon: the glyph sits beside text that already says it, and wrapping it
            would make a screen reader say &ldquo;accepted, accepted&rdquo;
          </Text>
        </Row>
      </Case>

      <Case
        title="Icon"
        note={`the whole set — ${SET.length} names, and adding one is a line in a single file`}
        sources={[sources[2]]}
      >
        <div className={s.iconGrid}>
          {SET.map(({ name, Icon }) => (
            <div key={name} className={s.iconCell}>
              <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
              <span className={s.iconName}>{name}</span>
            </div>
          ))}
        </div>
        <Row label="why">
          <Text size="xs" tone="quiet">
            Routing every import through one file made the surface countable, and the first thing it
            showed was <code>Target as TargetIcon</code> in the topbar — lucide&rsquo;s{" "}
            <code>Target</code> colliding with this product&rsquo;s own <code>target</code> noun,
            being renamed privately at one call site.
          </Text>
        </Row>
      </Case>

      <Case title="Portal" note="the box below clips its children; one of them escapes anyway">
        <Row label="clipped">
          <div className={s.clipBox}>
            <Text size="xs">A child inside overflow: hidden</Text>
            <div className={s.escapee}>clipped</div>
          </div>
        </Row>
        <Row label="portalled">
          <div className={s.clipBox}>
            <Text size="xs">Same box, but the badge is portalled to the body</Text>
            <Portal>
              <span className={s.portalled}>
                Portal demo · rendered into &lt;body&gt;, so nothing above clips it
              </span>
            </Portal>
          </div>
        </Row>
        <Row label="why">
          <Text size="xs" tone="quiet">
            A dropdown inside a scrolling table, and a tooltip inside the entity canvas — whose field
            carries a <code>transform</code> — are the same bug, and no z-index fixes either. A
            transform creates a containing block and nothing escapes it.
          </Text>
        </Row>
      </Case>
    </Section>
  );
}
