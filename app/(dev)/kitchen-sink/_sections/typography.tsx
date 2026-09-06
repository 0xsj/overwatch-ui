import { Heading, Text } from "@/components/typography";
import { Panel, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";

export async function TypographySection() {
  const sources = await readSources(["typography/text/text.tsx"]);
  return (
    <Section id="typography" title="Typography" blurb="Two primitives. Heading takes a level and a scale separately, because the outline and the size are different decisions.">
      <Panel title="Heading">
        <Heading level={2} scale="d0">Build the record</Heading>
        <Heading level={2} scale="d1">Build the record</Heading>
        <Heading level={2} scale="d2">Build the record</Heading>
        <Heading level={2} scale="h1">Build the record</Heading>
        <Heading level={2} scale="h2">Build the record</Heading>
        <Heading level={2} scale="h3">Build the record</Heading>
        <Heading level={2} scale="label">Section label</Heading>
      </Panel>
      <Panel title="Text" sources={sources}>
        <Row label="size"><Text size="xs">xs</Text><Text size="sm">sm</Text><Text size="md">md</Text><Text size="lg">lg</Text></Row>
        <Row label="tone"><Text tone="primary">primary</Text><Text tone="secondary">secondary</Text><Text tone="tertiary">tertiary</Text><Text tone="quiet">quiet</Text><Text tone="accent">accent</Text></Row>
        <Row label="mono"><Text mono>sha256:4f2b9c…a91c</Text></Row>
        <Row label="measure"><Text tone="secondary" measure>An observation is what one source said; an entity is an argument across many, and the argument is the thing this product keeps.</Text></Row>
      </Panel>
    </Section>
  );
}
