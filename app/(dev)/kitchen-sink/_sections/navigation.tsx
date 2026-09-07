import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  NavLink,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/navigation";
import { Text } from "@/components/typography";
import { Panel, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function NavigationSection() {
  const sources = await readSources([
    "navigation/nav-link/nav-link.tsx",
    "navigation/breadcrumb/breadcrumb.tsx",
  ]);

  return (
    <Section
      id="navigation"
      title="Navigation"
      blurb="Moving between places, and saying where you are. The distinction that matters here is between switching a ROUTE and switching a PANEL — they look identical and are different things to a screen reader."
    >
      <Panel
        title="NavLink"
        note="semantics, almost no appearance — the rail and the sidebar look nothing alike"
        sources={[sources[0]]}
      >
        <Row label="page">
          <NavLink href="#navigation" active="page" className={s.navDemo}>Report</NavLink>
          <Text as="span" size="xs" tone="quiet">
            <code>aria-current=&quot;page&quot;</code> — this IS the page. The sidebar.
          </Text>
        </Row>
        <Row label="true">
          <NavLink href="#navigation" active className={s.navDemo}>Findings</NavLink>
          <Text as="span" size="xs" tone="quiet">
            <code>aria-current=&quot;true&quot;</code> — current without a more specific
            relationship. The rail marks a <strong>section</strong>, and{" "}
            <code>/findings/report</code> is not the Findings link&rsquo;s page.
          </Text>
        </Row>
        <Row label="off">
          <NavLink href="#navigation" className={s.navDemo}>Board</NavLink>
          <Text as="span" size="xs" tone="quiet">
            no attribute at all — <code>aria-current=&quot;false&quot;</code> is announced by some
            screen readers, so absent is the only correct off state.
          </Text>
        </Row>
      </Panel>

      <Panel title="Breadcrumb" note="an ordered list, and the last crumb is not a link" sources={[sources[1]]}>
        <Row label="trail">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#navigation">31m</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#navigation">Halcyon</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Coverage</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Row>
        <Row label="why">
          <Text size="xs" tone="quiet">
            A real <code>&lt;ol&gt;</code> inside <code>nav[aria-label=&quot;Breadcrumb&quot;]</code>,
            so the trail is announced as a list with a length and a position. The separators are{" "}
            <code>role=&quot;presentation&quot;</code> and <code>aria-hidden</code> — a slash read
            aloud between every crumb is noise. The last crumb is text, not a link: a link to where
            you already are is a link that does nothing.
          </Text>
        </Row>
      </Panel>

      <Panel title="Tabs" note="switches a PANEL in place — never a route">
        <Row label="tabs">
          <Tabs defaultValue="flat">
            <TabsList>
              <TabsTrigger value="flat">Flat</TabsTrigger>
              <TabsTrigger value="chain">Chain</TabsTrigger>
            </TabsList>
            <TabsContent value="flat">
              <Text size="sm" tone="tertiary">
                Every observation for this value, listed. Arrow keys move between the two triggers
                and only the selected one is in the tab order.
              </Text>
            </TabsContent>
            <TabsContent value="chain">
              <Text size="sm" tone="tertiary">
                The same observations, walked back to the bytes they were read out of.
              </Text>
            </TabsContent>
          </Tabs>
        </Row>
        <Row label="not a route">
          <Text size="xs" tone="quiet">
            The mock uses one segmented control for two jobs. <strong>Flat / Chain</strong> swaps
            content in place — that is this. <strong>Canvas / List</strong> carries{" "}
            <code>data-go</code> and navigates to another page — that is a pair of NavLinks, because
            Tabs would announce a <code>tabpanel</code> that does not exist and wire{" "}
            <code>aria-controls</code> to an id on a page nobody has loaded.
          </Text>
        </Row>
      </Panel>
    </Section>
  );
}
