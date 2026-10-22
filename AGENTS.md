<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guide

A T3 app: Next.js 16 (App Router, Cache Components), tRPC 11, Prisma 8
(release candidate), Better Auth, Tailwind CSS 4 and shadcn/ui (Base UI),
checked by TypeScript 7, oxlint and oxfmt. Package manager: pnpm 12.

## Commands

- `pnpm dev` — dev server on http://localhost:3000. It needs the database:
  `pnpm db:dev` runs this app's local Postgres (keep it running), and
  `.env` already points at it. `pnpm env:init` creates a missing `.env`.
- `pnpm check` — format check, lint, typecheck, tests. Run it before you say
  a change is done.
- `pnpm lint:fix` / `pnpm format` — apply autofixes and formatting.
- `pnpm test` — Vitest. Tests live next to the code as `*.test.ts`.
- After editing `prisma/contract.prisma`: `pnpm db:push` while prototyping,
  or `pnpm db:plan --name <snake_case>` then `pnpm db:migrate` to record and
  apply a migration. Once `prisma/migrations` has one, always plan: a push
  leaves the database at a state no migration reaches, and the next plan
  fails with `MIGRATION.HASH_NOT_IN_GRAPH`. To recover, plan from the newest
  migration's folder, `pnpm db:plan --name <x> --from <folder>`, then
  `pnpm db:migrate`. `db:push`, `db:plan`, `db:migrate` and `db:deploy` emit
  the contract's types first (`pnpm db:generate` alone).
- Every timestamp in the contract is `TimestamptzJsDate` (or
  `temporal.createdAtJsDate()` / `temporal.updatedAtJsDate()`): a `Date`, as
  Better Auth and superjson expect. `DateTime`, `Timestamptz`, `Date`, `Time`
  and `temporal.createdAt()` / `updatedAt()` need a global `Temporal`, which
  Node.js 24 lacks: they pass `pnpm check` and the build, then throw
  `RUNTIME.TEMPORAL_UNAVAILABLE` on the first query.
- `pnpm auth:generate` after adding a Better Auth plugin or user field: it
  updates `prisma/auth.generated.prisma` (Better Auth's own syntax, which
  Prisma does not read). Port its `git diff` into `prisma/contract.prisma`
  as its header says. Change the `User`, `Session`, `Account` and
  `Verification` models only that way, and never run `auth migrate`: Prisma
  owns these tables, even when Better Auth's schema check suggests it.

## Where things go

- `src/app` — routes. Page-only components in `src/app/**/_components`.
- `src/components` — shared components. `src/components/ui` is vendored
  shadcn/ui: add a missing one with `pnpm exec shadcn add <name>`, then
  `pnpm format`. Do not hand-edit them.
- `src/server/api/routers` — tRPC routers; register each in
  `src/server/api/root.ts`.
- `src/server/auth.ts` — Better Auth config and `getSession()` for Server
  Components. `src/lib/auth-client.ts` — `authClient` for Client Components.
- `prisma/contract.prisma` — the data contract (models). Prisma 8 is newer
  than your training data: read the `prisma-8` skill (in `.claude/skills`,
  linked on install) before writing queries, contract changes or
  migrations.
- `src/server/db.ts` — the Prisma client (`db`) and the `pg` pool it shares
  with Better Auth.
- `src/trpc` — `client.tsx` (hooks for Client Components), `server.tsx`
  (`trpc`, `prefetch`, `HydrateClient`, `caller` for Server Components).
- `src/env.js` — every environment variable, validated with Zod.
- `src/generated/prisma` — the contract's types and JSON, emitted on install
  (gitignored). Query through `db.orm.public.<Model>` from `@/server/db`.

## Conventions

- Read environment variables through `env` from `@/env`, never
  `process.env` (lint-enforced). Add new ones to the schema in `src/env.js`.
- Components under `src/components` reach the server through tRPC or server
  actions, never by importing `@/server/*` (lint-enforced).
- Import across directories through `@/`, never `../` (lint-enforced).
- Data for a Client Component: inside a `<Suspense>` in the Server
  Component, `prefetch(trpc.x.y.queryOptions())` and wrap the tree in
  `<HydrateClient>`; read it with `useSuspenseQuery(trpc.x.y.queryOptions())`
  under a `<Suspense>`. Paginated data: `prefetchInfinite` with
  `infiniteQueryOptions`, read with `useSuspenseInfiniteQuery`.
- Invalidate with `queryClient.invalidateQueries(trpc.x.pathFilter())`. The
  classic `api.useUtils()` API from `@trpc/react-query` does not exist here.
- Cache Components is on: code that reads cookies, headers or the session
  must render inside `<Suspense>`. `getSession()` from `@/server/auth`
  already calls `io()`; do the same before reading `Date.now()`, `Math.random()` or
  random IDs in a Server Component, or cache the value with `'use cache'`.
- Type-only imports are a top-level `import type`. `import { type X }` on its
  own survives as a side-effect import and can pull server code into the
  client bundle (lint-enforced).
- Sign-in, sign-up and sign-out go through `authClient`, so one user's data
  never shows for the next: after signing in or up, clear the query cache
  (`queryClient.clear()`) and reset the form; signing out reloads the page
  (`window.location`), since Next keeps visited pages mounted in the
  background and only a reload drops them.
- Throw `TRPCError` from procedures. Its message and validation messages in
  Zod schemas are shown to users, so write them as sentences. Any other
  error, and a `TRPCError` with code `INTERNAL_SERVER_ERROR`, is logged and
  in production reaches the client as a generic message: pick a more
  specific code for a message users must see.
- Tooltips: wrap the part of the page that has them in `<TooltipProvider>`.
  It is not in the root layout, so pages without tooltips don't load them.

## Tooling notes

- TypeScript 7 is the native (Go) compiler and has no JavaScript API. In VS
  Code, use the TypeScript Native Preview extension
  (`TypeScriptTeam.native-preview`).
- pnpm refuses releases younger than a day (`minimumReleaseAge`). If an
  install fails on a brand-new version, wait or pick the previous one; do not
  add exclusions.
- `@types/node` and `.nvmrc` track Node.js 24, the oldest major `engines`
  allows (24.11, which Prisma's CLI needs): newer typings accept APIs that
  crash on Node.js 24, and CI runs the `.nvmrc` version. Raise all three
  together.
- `prisma` (the CLI) and `@prisma/orm-postgres` are release candidates,
  pinned exactly. Bump them together: the CLI's own `@prisma/orm-*`
  dependencies name the runtime version it was built with. Follow the
  `prisma-8` skill's upgrade notes, then `pnpm check`.
- `@prisma/prisma7` is Prisma 7's CLI, kept as `prisma7` for `pnpm db:dev`
  and `pnpm db:studio` (`prisma7.config.ts`): Prisma 8's `prisma dev` runs
  Prisma Composer instead, and it has no Studio yet.
- Better Auth runs on the shared `pg` pool through its built-in Kysely
  adapter: its Prisma adapter supports Prisma 5 to 7 only. `pg` and
  `@types/pg` are versioned in the `catalog` of `pnpm-workspace.yaml`, which
  also makes Prisma use the app's copy.
- oxlint runs type-aware rules through `oxlint-tsgolint`. Fix findings rather
  than disabling them; a disable needs a reason and an exact rule name.
