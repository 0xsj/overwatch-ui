import { Text } from "@/components/typography";
import s from "./legend.module.css";

const KEYS = [
  {
    art: <line x1="1" y1="5" x2="33" y2="5" stroke="var(--line-heavy)" strokeWidth="1.6" />,
    term: "attribution",
    gloss: "a claim that this belongs to the centre. Has a claimant, sometimes a confidence, and a state a person can change.",
  },
  {
    art: (
      <>
        <line x1="1" y1="5" x2="27" y2="5" stroke="var(--info)" strokeWidth="1.2" strokeDasharray="1 3" />
        <path d="M27 2l5 3-5 3z" fill="var(--info)" />
      </>
    ),
    term: "derivation",
    gloss: "this was read out of that. Not a claim, so nobody accepts it; it has an invocation and an artifact behind it.",
  },
  {
    art: <line x1="1" y1="5" x2="33" y2="5" stroke="var(--warn)" strokeWidth="1.4" strokeDasharray="4 3" />,
    term: "proposed",
    gloss: "a claim nobody has ruled on. The number beside the node is the model's confidence.",
  },
  {
    art: <line x1="1" y1="5" x2="33" y2="5" stroke="var(--line-strong)" strokeWidth="1.4" strokeDasharray="2 5" />,
    term: "rejected",
    gloss: "ruled against, and kept — so nothing proposes it again.",
  },
];

export function Legend() {
  return (
    <dl className={s.legend}>
      {KEYS.map(({ art, term, gloss }) => (
        <div key={term} className={s.item}>
          <svg width="34" height="10" aria-hidden="true" className={s.art}>{art}</svg>
          <div>
            <dt className={s.term}>{term}</dt>
            <dd className={s.gloss}>{gloss}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function NoSimilarity() {
  return (
    <Text size="xs" tone="tertiary" className={s.no}>
      <strong className={s.strong}>There are no similarity edges here, deliberately.</strong>{" "}
      “This key resembles that key” is the quadratic surface — possible pairings grow with the square
      of the corpus while real ones grow linearly, so precision collapses exactly as the corpus gets
      useful. A derivation is safe because it is not a guess: one source said so, and the artifact is
      on disk.
    </Text>
  );
}
