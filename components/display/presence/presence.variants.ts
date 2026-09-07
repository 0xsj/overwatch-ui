import { cva, type VariantProps } from "class-variance-authority";
import s from "./presence.module.css";

export const presenceVariants = cva(s.presence, {
  variants: {
    /* The three are separated by GLYPH, WORD and TYPOGRAPHY. Colour is the
       fourth signal, never the first — `unattempted` is italic with a dotted
       underline, which survives a greyscale print and a colourblind reader. */
    state: { present: s.present, absent: s.absent, unattempted: s.unattempted },
    /* Glyph only, for a dense table. The word moves into a VisuallyHidden —
       it is never dropped, because the whole point is that the reader can tell
       "we looked and there was nothing" from "nobody looked". */
    compact: { true: s.compact },
  },
  defaultVariants: { state: "present" },
});

export type PresenceVariants = VariantProps<typeof presenceVariants>;
