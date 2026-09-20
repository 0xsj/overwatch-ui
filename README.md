# Overwatch UI

The Next.js frontend for Overwatch, a source-grounded investigation workspace.
It helps researchers collect and inspect retained source material, record exact
observations, review evidence, author research records and relationships, and
produce qualified investigation briefs without losing provenance or human
control.

## What it supports

- Source references and retained text, URL, PDF, and image captures.
- Capture history, comparison, local text search, workspace-wide search, and
  Unicode-exact citation handoffs.
- Manual observations tied to an immutable capture or named extraction.
- Evidence review, comparison of observations, and bounded synthesis runs.
- Research records for people, accounts, organisations, and places.
- Qualified connections with supporting and opposing observations, review
  states, and append-only assessment history.
- Human-reviewed identity-resolution proposals that preserve the original
  records and citations.
- Exact repeated-asset comparison across target roots; it surfaces comparison
  leads without merging targets or making an identity claim.
- Workspace health reporting with measured probe counts and actionable symptoms
  for quiet failures such as unavailable tools, unread output, buried events,
  and unmapped fields.
- Workspace-scoped causal Logs with cursor pagination, decision-versus-machinery
  provenance, actor/origin context, and links into correlation chains.
- A server-derived What's new projection comparing the latest completed runs per
  target, preserving added/changed/gone distinctions and navigation back to the
  affected target and run; its per-account seen marker is persisted by the
  backend.
- Investigation questions, reported events, working notes, timelines, briefs,
  frozen handoffs, and source-grounded navigation between them.
- Bounded assistance that suggests passages or candidates; it never silently
  creates evidence, resolves identity, accepts relationships, or publishes a
  conclusion.
- A workspace-level assistance provider policy that shows whether retained
  material may leave the service boundary; external providers are blocked by
  default and only workspace admins can opt in.

The UI can run against the Overwatch backend or a supported in-memory fixture
adapter. Fixture-backed screens identify themselves with a `mock` badge; this
is useful for UI work when the backend is not running.

## Stack

- Next.js App Router, React, and TypeScript.
- CSS Modules with the project token and cascade-layer system.
- TanStack Query for server state and pagination.
- Shared service adapters under `lib/services` and transport/runtime seams
  under `lib/http`, `lib/query`, and `lib/root`.
- React Flow and Cytoscape are confined behind the investigation graph
  surfaces; layouts remain deterministic and owned by the project.

## Local development

From this repository:

```bash
npm ci
cp .env.example .env.local
npm run dev -- --port 7010
```

Open <http://localhost:7010>.

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the backend API, normally:

```text
NEXT_PUBLIC_API_URL=http://localhost:7002/v1
```

To work without the backend, remove or comment out `NEXT_PUBLIC_API_URL` in
`.env.local`. The client uses its fixture adapter in that mode.

The workspace root also provides the coordinated workflow:

```bash
make up       # start PostgreSQL, the test database, and Mailpit
make dev      # run the live repositories
make test     # run repository tests
make check    # repository checks, decision verification, and workspace checks
```

Run `make up` before `make dev` when using the real backend. The shared local
ports are documented in the workspace `RUNNING.md`: the UI uses `7010`, the
API uses `7002`, PostgreSQL uses `7020`, and Mailpit is at `7026`.

## Commands

```bash
npm run dev           # development server
npm run build         # production build
npm run start         # serve a production build
npm run lint          # ESLint
npm run test:research # research/navigation regression suite
npx tsc --noEmit      # TypeScript check
```

The repository Makefile exposes `make dev`, `make build`, `make test`, and
`make check` for the same workflow.

## Project layout

```text
app/                 routes and investigation screens
components/          UI primitives and composed display/form components
lib/services/        domain-shaped API clients, types, navigation, and helpers
lib/http/             transport boundary and API/memory adapters
lib/query/            query client and cache keys
lib/root/             runtime composition and fixture selection
tests/                focused research and navigation regression tests
```

The backend is maintained in the sibling `overwatch-backend` repository.

## Product boundaries

Overwatch is not an OCR-only document viewer. OCR and PDF extraction are
provenance-linked ways to make retained material inspectable. Observations,
records, connections, questions, and briefs remain authored investigation
artifacts. Assistance is deliberately bounded and reviewable; model output is
never evidence by itself.
