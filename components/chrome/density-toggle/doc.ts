/**
 * DensityToggle — comfortable or compact, for this browser only.
 *
 * # Why it changes tokens and not components
 *
 * It sets `data-density` on `<html>`, and `styles/tokens/shape.css` overrides
 * three control heights under that attribute. Nothing else in the codebase knows
 * density exists.
 *
 * The alternative — a `density` prop threaded through every control — is the
 * version that rots: forty components have to accept it, a new one forgets, and
 * the screen ends up half compact. Through the token tier a component follows by
 * reading `--control-md`, which it already does, and one that hard-codes a
 * height becomes visibly wrong the first time somebody flips this.
 *
 * # Why the DOM attribute is the store
 *
 * The value must be readable by CSS, so it has to live on an element. Keeping a
 * second copy in React state means keeping them in step, and mirroring an
 * external value into `useState` via an effect is the exact thing
 * `react-hooks/set-state-in-effect` exists to catch — twice, in this codebase.
 * `useSyncExternalStore` subscribes to the attribute instead.
 *
 * # It is not stored on the account, and that is stated rather than hidden
 *
 * `ALIGNMENT.md` asked which preferences the mock implies so they can be
 * designed rather than guessed; the answer sent back is theme and density, and
 * neither has a column yet. So this is per-browser and `account/preferences`
 * says so — a preferences screen that silently forgets is worse than one that
 * tells you it will.
 */
export {};
