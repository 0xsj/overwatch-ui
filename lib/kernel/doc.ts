/**
 * kernel — what everything may import and which itself imports nothing.
 *
 * # cn is five lines because the alternatives solve a problem this tree does not have
 *
 * `clsx` is the same join with a dependency and an object/array API nothing here
 * uses. `tailwind-merge` exists to resolve conflicts between competing utility
 * classes — a problem created by utility classes, which this tree does not have,
 * because CSS Modules hash a class per file and two of them cannot collide.
 *
 * So the whole job is: drop falsy values, join the rest with a space. The
 * function returns `""` rather than `undefined` for an empty result, because
 * `className={undefined}` and `className=""` render differently in a diff and
 * one of them is noise.
 *
 * `0` is deliberately kept rather than dropped. It is never a class name, and a
 * caller passing one has made a mistake worth seeing in the DOM rather than one
 * silently swallowed.
 *
 * # Why this is a module and not a file next to the first caller
 *
 * Because the second caller is always a different category, and the version that
 * lives beside the first one gets imported sideways — which is the beginning of
 * a `utils` directory whose import list nobody agreed to.
 */
export {};
