/**
 * lib/auth — a port the screens were shaped by, and a fake behind it.
 *
 * # Why a port at all, when there is no second implementation
 *
 * Because the alternative was worse in a specific way. `overwatch-backend` has no
 * identity endpoint; the session building one started with `identity` and `audit`
 * the same week. Writing `fetch("/api/auth/sign-in")` in a form would invent a URL,
 * a request body and a response envelope, and `PRODUCT.md` records that a contract
 * document was refused **on the grounds that it would lock in** — a session that
 * finds one builds from it. A fetch call hard-coded in a form is that document with
 * worse discoverability.
 *
 * So the seam is one interface, and the thing on the far side is honest about being
 * a fake. When the Go endpoint exists, an `http.ts` implements `AuthPort` and
 * `index.ts` changes which one it exports. Nothing in `app/(auth)` moves.
 *
 * **This is deliberately NOT a wire contract.** It has no field names a server must
 * emit, no status codes, no envelope. It is the set of questions these five screens
 * ask, in the client's own vocabulary, and a future adapter is free to translate.
 * The distinction matters: a contract constrains both sides, and this constrains
 * one.
 *
 * # Why the result type is a union rather than a thrown error
 *
 *     { ok: true, value } | { ok: false, message, field? }
 *
 * A failed sign-in is not exceptional — it is the second most common outcome, and
 * the one the screen is most responsible for rendering well. Throwing would put the
 * ordinary case on the error path, where a `catch` cannot tell it apart from a
 * network failure, and where React's error boundary would swallow it.
 *
 * `field` is optional, and its absence is meaningful rather than lazy. A message
 * with a field belongs beside that input; one without belongs to the form. *"Those
 * credentials do not match"* has no field on purpose — attaching it to the email
 * input tells an attacker which half was right, and this is the one place where
 * being unhelpful is correct.
 *
 * # Why `Invite` carries `expiresAt` as optional rather than nullable
 *
 * Absent means the access does not expire; present means it does, and the screen
 * must say when. That is the same rule the rest of this product runs on — absent
 * and "set to nothing" are different facts — and an invitation is where it first
 * has consequences for a person rather than for a record. The mock's members screen
 * states the policy: **external access outlives nothing by default.**
 *
 * # What the fake refuses to pretend
 *
 * `requestReset` succeeds and sends nothing. `signIn` with the right credentials
 * succeeds and creates no session. Every screen that calls one renders what the
 * adapter says about itself — `describe.note` — so the page cannot claim an email
 * is on its way. A fake that lies convincingly is how a demo becomes a bug report.
 *
 * The delays are real `setTimeout`s, and they are there so the pending state is
 * something a person can see rather than something only a slow network reveals.
 *
 * # The credential in `fake.ts` is not a secret
 *
 * `sj@vertexlabs.example` / `correct-horse-battery`, in plaintext, in the source. It
 * is a fixture for a `.example` address that resolves nowhere, and hiding it behind
 * an environment variable would imply it protects something. When a real adapter
 * arrives this file is deleted rather than edited.
 */
export {};
