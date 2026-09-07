import { Separator } from "@/components/layout";
import { Text } from "@/components/typography";
import { Panel, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";

export async function LayoutSection() {
  const sources = await readSources(["layout/separator/separator.tsx"]);

  return (
    <Section
      id="layout"
      title="Layout"
      blurb="Arrangement with no opinion about content. Separator is the one that carries meaning as well as a line — and the default is the meaningful one, so a rule that means nothing has to say so."
    >
      <Panel
        title="Separator"
        note="the role is the point; inspect it rather than look at it"
        sources={sources}
      >
        <Row label="semantic">
          <div style={{ inlineSize: "100%" }}>
            <Text size="sm">Everything attributed to this target</Text>
            <Separator style={{ marginBlock: "10px" }} />
            <Text size="sm">Everything that has never been looked at</Text>
            <Text size="xs" tone="quiet" style={{ marginBlockStart: "8px" }}>
              role=&quot;separator&quot; — announced. These are different things, and saying so is true.
            </Text>
          </div>
        </Row>

        <Row label="decorative">
          <div style={{ inlineSize: "100%" }}>
            <Text size="sm">A run finished</Text>
            <Separator decorative style={{ marginBlock: "10px" }} />
            <Text size="sm">A run finished</Text>
            <Text size="xs" tone="quiet" style={{ marginBlockStart: "8px" }}>
              role=&quot;none&quot; — a line drawn because two blocks looked crowded. Most rules are this one,
              and most codebases mark none of them.
            </Text>
          </div>
        </Row>

        <Row label="subtle">
          <div style={{ inlineSize: "100%" }}>
            <Separator subtle />
            <Text size="xs" tone="quiet" style={{ marginBlockStart: "8px" }}>
              --line rather than --line-strong, for a rule inside a component where the full one is
              too loud.
            </Text>
          </div>
        </Row>

        <Row label="vertical">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", blockSize: "24px" }}>
            <Text as="span" size="sm">Board</Text>
            <Separator orientation="vertical" />
            <Text as="span" size="sm">Report</Text>
            <Separator orientation="vertical" />
            <Text as="span" size="sm">Lineage</Text>
          </div>
        </Row>
      </Panel>
    </Section>
  );
}
