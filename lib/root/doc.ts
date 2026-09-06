/**
 * root — the composition root, and the only file that picks an adapter.
 *
 *     root  may import  everything below it
 *     root  ✗ imported by anything except app/
 *
 * One export decides the whole application's transport:
 *
 *     NEXT_PUBLIC_API_URL set    → createFetchClient
 *     absent                     → createMemoryClient over lib/root/fixtures
 *
 * Nothing above this file changes between the two. That was verified rather than
 * asserted: built against `http://localhost:7002/v1`, the sign-in form made a real
 * request to the running Go server, received its 404 for the unbuilt route, and
 * rendered it through the same `AppError` path the fixtures use.
 *
 * # Why the fixtures live here rather than beside the service
 *
 * A fixture is not part of a domain's contract; it is part of this application's
 * configuration. Putting `auth.ts` fixtures inside `services/auth` would make the
 * service import a fake, which is exactly the coupling the port removes — and it
 * would put the answer to "what does this build do without a server" in fourteen
 * places instead of one array.
 *
 * `fixtures/index.ts` concatenates every domain's routes into one list, in order,
 * so a route that exists cannot be unreachable because nobody registered it.
 *
 * # `transport` is a string a screen renders, and that is deliberate
 *
 * The auth shell prints it. A build on fixtures says so on every page, so the UI
 * cannot claim an email is on its way when nothing sends mail. A fake that lies
 * convincingly is how a demo becomes a bug report — and the honest version costs
 * one string.
 *
 * # What is not here yet
 *
 * A React provider. `lib/root/provider.tsx` is where a query client and the
 * session would be handed down, and neither exists — every caller today is a
 * server action or a server component, and adding a provider before something
 * needs it would be a state with no caller.
 */
export {};
