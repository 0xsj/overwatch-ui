/**
 * runtime — state the shell owns, which no server has an opinion about.
 *
 * The tier boundary is a question with a short answer: **could a server answer
 * this?** Whether the sidebar is hidden is not a fact about an organisation. No
 * endpoint returns it, no other person would agree with it, and it survives a
 * reload only because this browser remembered. That is what `runtime` holds, and
 * it is why `@tanstack/react-query` is the wrong tool for it — a query cache
 * caches answers, and there is no question here.
 *
 * The tier arrives now because the shell is its first caller, which is the rule
 * the client tiers are built under: a tier with no caller is a guess about what a
 * caller will need, and it is wrong in a way nobody notices until something
 * finally reaches it.
 *
 * # localStorage is an external store, so it is read as one
 *
 * The first shape written here was a `ShellProvider` holding `useState`, with an
 * effect that read `localStorage` on mount and called `setState`. It compiled and
 * it worked, and `react-hooks/set-state-in-effect` refused it — correctly. That
 * shape renders once with a value it knows is provisional, then renders again;
 * the second render is the one that is right, and every consumer pays for the
 * first.
 *
 * `useSyncExternalStore` is what the pattern is actually called. It takes three
 * functions and each answers a different question:
 *
 *     subscribe          how do I hear that it changed
 *     getSnapshot        what is it now, in this browser
 *     getServerSnapshot  what does the server render, having no browser
 *
 * There is still one frame where a hidden sidebar is shown — the server cannot
 * know the preference, so the first HTML always has the sidebar. The difference
 * is that React now owns that transition instead of an effect racing paint.
 *
 * The alternative that removes the frame entirely is a blocking inline script in
 * `<head>` that sets an attribute before first paint. A theme earns that; the
 * wrong theme is a flash of white in a dark room. A sidebar appearing for one
 * frame is not, and a synchronous script in the critical path is paid on every
 * page load by everybody.
 *
 * # Why a module-level store is safe here and a module-level `let` is not
 *
 * A mutable module value in a Next application is shared across *requests* on the
 * server, so a naive `let hidden = false` read during render would serve one
 * person's sidebar state to the next. That failure works perfectly in development,
 * where one person loads pages one at a time.
 *
 * This module is safe because the server never reads the mutable half.
 * `getServerSnapshot` returns a constant, `getSnapshot` and `setSidebarHidden` run
 * only in the browser, and the `cached` variable stays `null` for the lifetime of
 * the server process. That is a property of this file rather than of the pattern,
 * and it is the thing to check first if anything else is ever added here.
 *
 * Both `try/catch` blocks are load-bearing rather than defensive noise. Safari in
 * private browsing *throws* on `setItem` — not returns, throws — and an uncaught
 * throw here takes the shell down. The failure mode as written is that the
 * preference does not persist, which is the correct thing to lose.
 *
 * # Hidden, not collapsed
 *
 * The mock calls this `collapsed` and animates the grid column to zero. The state
 * is named for what a person sees — the sidebar is gone — rather than for the
 * mechanism, because the mechanism has already changed once and the meaning has
 * not.
 *
 * # The keyboard shortcut is Ctrl+Z and it is a collision
 *
 * The mock binds `^Z`. Ctrl+Z is undo everywhere else, and this is a real cost
 * rather than an oversight — recorded here so that the first person who types into
 * a field inside the shell and loses their undo knows it was seen. The handler
 * skips the event when a modifier that would make it Cmd+Z is held, but it does
 * fire while a text field has focus, and that is the case that will eventually
 * force a change.
 *
 * The obvious fix — ignore the event when the target is an input — is not here
 * because no screen inside the shell has a text field yet, and a guard written for
 * a case nobody has hit is a guard nobody has tested.
 *
 * `useSidebarShortcut` is a hook rather than a listener registered at module load
 * so that it is bound once by the one component that mounts it, and unbound when
 * that component goes. A module-load listener would attach in any environment that
 * imported the file, including a test.
 *
 * # Deliberately absent
 *
 * **A `storage` event listener.** Two tabs open on the shell will disagree about
 * the sidebar until one of them reloads. `subscribe` is the exact place that would
 * be fixed, and it is not fixed because nobody has hit it.
 *
 * **Theme.** `ThemeToggle` reads the document element through the same
 * `useSyncExternalStore` shape and writes straight back to it, which makes the DOM
 * the store. It belongs here the moment a second thing needs to read the theme;
 * nothing does.
 *
 * **Density.** v1 had one. No screen here has enough rows to want it yet.
 *
 * **A `currentPage` field.** The pathname is already the state, the router already
 * owns it, and a mirror of it in a context is a second source of truth that goes
 * stale during a transition.
 */
export {};
