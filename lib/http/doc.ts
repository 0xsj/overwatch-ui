/**
 * http — the only tier that knows HTTP exists.
 *
 * The mirror image of the server's `pkg/httpx`, and the two are best read as one
 * contract split across a wire. `httpx` takes a Go error carrying a `Kind` and
 * produces a status code plus a JSON body; this module takes that status and body
 * and produces an `AppError`.
 *
 *     http  may import  kernel
 *     http  ✗ react · services · components · app
 *
 * Above this line the application deals in values. No `Response`, no status
 * number, no `res.json()` and no header name appears in a service, an action or a
 * component.
 *
 * # Why not fetch in each service
 *
 * Every request needs the same six things regardless of which endpoint it hits:
 * base URL resolution, an auth header, a timeout, JSON serialisation,
 * query-string building, and the success/failure decision. None of those is about
 * accounts or invitations. Pushed into the services they become a copy per
 * domain, and changing the timeout policy becomes an edit whose drift is
 * invisible until one endpoint behaves differently under a flaky network.
 *
 * # Two adapters, one port, and the screen cannot tell
 *
 *     fetch-client   the real transport
 *     memory-client  fixtures, no network, same AppError values
 *
 * `lib/root` is the only place that picks. That is what makes running the whole
 * application with no server a supported mode rather than a stub: a route that
 * exists only in `memory-client` would be a hole in it, which is why the memory
 * adapter answers through the port and 404s off the end of its route list exactly
 * as a server would.
 *
 * # envelope.ts is the isolation point, and it is the file to read first
 *
 * It is the only file in the tree permitted to name a wire key. The shape is
 * `pkg/httpx`'s `problem`, and it is **flat** —
 *
 *     {"kind":"invalid","message":"…","type":"…","fields":{…},"request_id":"…"}
 *
 * `kind` is a top-level key, not nested under `error`. That was checked against
 * `respond.go` rather than assumed, and it is the one assumption most likely to
 * be wrong somewhere else.
 *
 * **The body's `kind` wins over the status code.** The server has already
 * classified — `pkg/errors.Kind` says how a caller should react — so recovering a
 * kind from the status when the body states one would be the same work done twice
 * and drifting. `kindFromStatus` exists only for bodies that are not ours: a
 * proxy's 502, an HTML error page, Go's own mux answering `text/plain` for a route
 * that does not exist yet.
 *
 * **`request_id` falls back to the `X-Request-Id` header**, and that came from
 * measurement rather than design. Pointed at the running server, a request to an
 * unbuilt route returned 404 with a `text/plain` body and the header set. Without
 * the fallback the only traceable fact is lost exactly when the route is missing,
 * which is when somebody most needs it.
 *
 * `errorFromResponse` never throws on a malformed body. An error path that can
 * itself fail replaces one diagnosis with a worse one.
 *
 * # Why it throws
 *
 * A fetch wrapper wants to throw and a form wants a value. The conversion happens
 * once, at the boundary — `app/(auth)/_form-state.ts` — rather than in a catch
 * block per action. When `query` and `bindings` arrive they will want the throw
 * as it is, because a cache library is built around it.
 */
export {};
