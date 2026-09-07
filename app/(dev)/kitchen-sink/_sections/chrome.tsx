import { Mark, ThemeToggle } from "@/components/chrome";
import { Text } from "@/components/typography";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function ChromeSection() {
  const sources = await readSources(["chrome/mark/mark.tsx"]);

  return (
    <Section
      id="chrome"
      title="Chrome"
      blurb="The two pieces here are not primitives — they are this product. A different application using this design system would take Button and Panel and would not take these, which is the whole test for the family."
    >
      <Case title="Mark" note="drawn rather than imported, so it takes currentColor" sources={sources}>
        <Row label="sizes">
          <span className={s.markInk}><Mark size={16} /></span>
          <span className={s.markInk}><Mark size={19} /></span>
          <span className={s.markInk}><Mark size={32} /></span>
        </Row>
        <Row label="currentColor">
          <span className={s.markAccent}><Mark size={24} /></span>
          <span className={s.markInk}><Mark size={24} /></span>
          <span className={s.markQuiet}><Mark size={24} /></span>
          <Text as="span" size="xs" tone="quiet">
            The rail tints it with the accent. A file could not do that without one copy per colour,
            and an <code>&lt;img&gt;</code> at 19px is a network request for less than its own header.
          </Text>
        </Row>
        <Row label="named by its wrapper">
          <Text size="xs" tone="quiet">
            <code>aria-hidden</code> is unconditional and there is no <code>title</code>. Everywhere
            it appears it sits inside something already named — the rail&rsquo;s logo link is
            labelled &ldquo;Overwatch&rdquo; — and a second announcement of the product name on every
            screen is noise.
          </Text>
        </Row>
      </Case>

      <Case title="ThemeToggle" note="three states, and the third is the absence of an attribute">
        <Row label="toggle">
          <ThemeToggle />
          <Text as="span" size="xs" tone="quiet">
            the one in the header above is the same component — press either and both update, because
            neither holds the state.
          </Text>
        </Row>
        <Row label="why three">
          <Text size="xs" tone="quiet">
            <code>data-theme=&quot;dark&quot;</code>, <code>data-theme=&quot;light&quot;</code>, and{" "}
            <strong>no attribute at all</strong> — which is &ldquo;match the system&rdquo; and is not
            the same as either. A two-state toggle cannot express it, and a page that stamps one on
            load has silently overridden the reader&rsquo;s own setting.
          </Text>
        </Row>
        <Row label="the store is the DOM">
          <Text size="xs" tone="quiet">
            It reads <code>document.documentElement</code> through{" "}
            <code>useSyncExternalStore</code> with a <code>MutationObserver</code>, rather than
            keeping a copy in <code>useState</code>. That is why two of them agree, and why an
            attribute set by anything else is picked up rather than overwritten.
          </Text>
        </Row>
      </Case>
    </Section>
  );
}
