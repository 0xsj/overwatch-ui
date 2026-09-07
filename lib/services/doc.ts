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
 * Optional, not nullable: absent means the fact is not there. Absent and "set to
 * nothing" are different facts, which is the rule the whole product runs on.
 *
 * # Four domains, and the line through them is what is SERVED
 *
 *     identity  real   accounts, sessions, verifications, password resets
 *     tenancy   real   /v1/me, members, opening a workspace
 *     access    none   invitations, role changes, grants
 *     entities  none   the canvas
 *
 * `access` is the interesting one. Its model is sealed — `decisions/0019` names
 * five roles and an ordered four-rung grant — and not one of its commands exists
 * over HTTP. Keeping it as its own folder rather than as unserved functions
 * inside `tenancy` is what lets `lib/root` make the adapter choice per domain and
 * be right: `tenancy` reaches the server, `access` reaches fixtures, and neither
 * needs a flag.
 *
 * # `shell` was a domain and is now a function, which is the correction
 *
 * There used to be a `shell` service with one call, `GET /me/context`, invented
 * so the chrome could draw itself in one read rather than three. `doc.ts` said at
 * the time: *"the bet it makes is that the server will grow an endpoint shaped
 * like this one."*
 *
 * It did. `GET /v1/me` answers who you are, which orgs you are in, your role in
 * each, and every workspace you can see with your own level on it — the same
 * question and more. So the proposal is deleted rather than kept beside it: two
 * endpoints answering overlapping questions is two things to keep agreeing, and
 * the second one has no server behind it.
 *
 * What is left is `selectShellContext`, a pure function over the boot call. It
 * cannot fail, it cannot be stale relative to `/v1/me`, and it returns `null`
 * rather than throwing — because having nowhere to be is a legitimate state
 * during the milliseconds after registration, and an error screen for it would be
 * wrong about a normal thing.
 */
export {};
