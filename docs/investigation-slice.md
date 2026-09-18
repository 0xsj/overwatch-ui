# Investigation source workflow

Research routes carry the workspace and record IDs because a cookie alone cannot restore the right investigation through browser Back or a shared citation.

The first complete research flow is under `/investigation`: create/select an existing workspace, add retained text or a UTF-8 text/JSON file, read a capture, and record a manually cited observation. URL-only references explicitly show that they contain no retained text. Later captures append versions; an observation always opens its original capture. Source content is rendered as text, with local case-insensitive search and occurrence navigation inside the selected retained text or derived extraction. The source catalog supports case-insensitive server search over source metadata, with cursor pagination continuing within the active search.

Working notes reuse the existing workspace summary-note API. They are editable and author-owned. They hold questions and interpretation, while source-backed observations are immutable statements with an exact retained passage. The notebook filters and paginates the loaded latest-100 window, and exact note URLs hydrate a note by ID when it falls outside that window. Sources and observations use cursor pagination.

The existing workspace remains the permission boundary. Open context is validated against `/me`; closed investigations resolve through the authorised workspace listing and render read-only, and every API read/write checks workspace access independently. Client-role users continue to receive reports only. Existing tools, run history, security views, and settings remain reachable.

## Capture and citation details

The client and server agree on Unicode code-point offsets, rather than JavaScript UTF-16 indices. `lib/services/sources/citation.ts` finds every occurrence and verifies the selected range before highlighting it. Repeated passages have an explicit occurrence selector. The reader requests the cited observation directly and refuses to substitute the latest capture when a citation/capture is unavailable or mismatched.

Input is limited to 256 KiB per capture. The Server Action transport permits 2 MiB to accommodate JSON escaping without weakening the capture limit. Imported text is decoded as UTF-8 with errors rejected and a BOM retained. JSON is validated; its formatting is preserved. No URL fetching, collection run, or model processing happens during intake.

## Transports and checks

`sources` and `notes` use the existing session-aware transport selection. Set `NEXT_PUBLIC_API_URL` to the backend's `/v1` base for a live account. Fixture personas always use mock data. Research fixtures and workspace mutations share a namespaced process-global store so route bundles and hot reload do not erase an in-progress demo. This store is temporary and resets with the UI server; it is not production persistence.

`npm run test:research` exercises non-ASCII and overlapping citations, unavailable/wrong-context links, and closed-investigation read-only behavior. It uses Node's built-in TypeScript stripping (verified on Node 24). Normal TypeScript, ESLint, and Next production checks cover integration. Browser acceptance also needs the live API/database path in addition to fixture mode.

Used in: `app/(app)/investigation`, `app/(app)/_route-context.ts`, `lib/services/sources`, `lib/services/notes`, and `lib/root/fixtures/research.ts`.
