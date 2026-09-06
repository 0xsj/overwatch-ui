/**
 * services — one folder per domain, and no React anywhere in it.
 *
 *     services  may import  kernel · http (the TYPE only)
 *     services  ✗ react · components · app · root
 *
 * A service is a set of functions that take an `HttpClient` and return a
 * promise. It does not create a client, does not read configuration, and does not
 * know whether it is talking to a server or to fixtures — that is `lib/root`'s
 * single decision, and taking the client as an argument is what keeps it single.
 *
 * # Why the client is a parameter and not an import
 *
 * The moment a service imports a concrete client, the choice of adapter is made
 * in fourteen places instead of one, and running the application on fixtures
 * stops being a mode and becomes a code change. Passing it in also means a
 * function can be called with a stub in a test without a module mock — which
 * matters more here than usual, because there are no tests yet and this is the
 * cheap way to leave the door open.
 *
 * # The types are the wire shape, in the wire's spelling
 *
 * `invited_by`, `expires_at` — snake_case, because that is what the server sends
 * and a rename here would be a second vocabulary to keep in step. The screens
 * read these fields directly. If that ever becomes intolerable, the translation
 * belongs in one mapping function per domain, not spread through components.
 *
 * `expires_at` is **optional, not nullable**: absent means access does not
 * expire. Absent and "set to nothing" are different facts, which is the rule the
 * whole product runs on, and an invitation is where it first has consequences for
 * a person rather than for a record.
 *
 * # The paths are the least certain thing in this tree
 *
 * `/auth/sign-in`, `/invites/{token}/acceptance` — the server has no identity
 * routes yet, so these are proposals. They are confined to one file per domain on
 * purpose: that is what the seam buys. When the real routes land, `auth.api.ts`
 * changes and nothing above it does.
 */
export {};
