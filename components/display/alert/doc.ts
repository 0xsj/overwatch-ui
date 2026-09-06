/**
 * Alert — a message about the form, as distinct from a message about one field.
 *
 * # Why it is not Field's error
 *
 * `Field` renders an error tied to one control, wired through `aria-describedby`
 * so a screen reader announces it when focus lands there. That is the right shape
 * for *"this value is wrong"* and the wrong shape for *"those credentials do not
 * match"* — which belongs to no field, and where pointing at the email input is a
 * small lie that also tells an attacker which half was right.
 *
 * # role and aria-live are derived from tone, and the two are not the same
 *
 *     crit   → role="alert"   aria-live="assertive"
 *     others → role="status"  aria-live="polite"
 *
 * `assertive` interrupts whatever is being read. That is correct for a failed
 * submission — the person is waiting for it — and wrong for a confirmation, which
 * should wait its turn.
 *
 * `live={false}` drops BOTH, for the case this component is rendered as static
 * page furniture rather than as the result of an action. Dropping only `aria-live`
 * is not enough and that was the first version: `role="status"` carries an implicit
 * `aria-live="polite"`, so a standing notice stayed in the announcement set and
 * competed with the real result of a submission. The role and the live region are
 * the same decision and have to be dropped together.
 *
 * # The glyph is not decoration
 *
 * The tones are the same four hues the rest of the tree uses, and the accent hue
 * is also the healthy state, so a coloured box alone distinguishes nothing for a
 * colourblind reader. The glyph carries the state redundantly and is `aria-hidden`
 * because the text says it too — the same argument as Chip.
 *
 * It is overridable because an auth screen's *"check your email"* wants an
 * envelope rather than a tick, and that is a per-call decision, not a fifth tone.
 *
 * # Deliberately absent
 *
 * A title prop, a dismiss button, and an icon slot separate from the glyph. A
 * title is `<strong>` in the children; a dismissable alert needs state and is a
 * composition; an icon is what the glyph already is.
 */
export {};
