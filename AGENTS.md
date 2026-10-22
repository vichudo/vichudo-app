<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guide

A T3 app: Next.js 16 (App Router, Cache Components), tRPC 11, Prisma 7,
Better Auth, Tailwind CSS 4 and shadcn/ui (Base UI), checked by TypeScript 7,
oxlint and oxfmt. Package manager: pnpm 12.

## Commands

- `pnpm dev` — dev server on http://localhost:3000. It needs the database:
  `pnpm db:dev` runs this app's local Postgres (keep it running), and
  `.env` already points at it. `pnpm env:init` creates a missing `.env`.
- `pnpm check` — format check, lint, typecheck, tests. Run it before you say
  a change is done.
- `pnpm lint:fix` / `pnpm format` — apply autofixes and formatting.
- `pnpm test` — Vitest. Tests live next to the code as `*.test.ts`.
- `pnpm db:push` (prototype) or `pnpm db:migrate` (migration) after editing
  `prisma/schema.prisma`; both regenerate the client.
- `pnpm auth:generate` after adding a Better Auth plugin or user field: it
  writes the tables auth needs into `prisma/schema.prisma`. Do not hand-edit
  the `user`, `session`, `account` and `verification` models.

## Where things go

- `src/app` — routes. Page-only components in `src/app/**/_components`.
- `src/components` — shared components. `src/components/ui` is vendored
  shadcn/ui: add a missing one with `pnpm exec shadcn add <name>`, then
  `pnpm format`. Do not hand-edit them.
- `src/server/api/routers` — tRPC routers; register each in
  `src/server/api/root.ts`.
- `src/server/auth.ts` — Better Auth config and `getSession()` for Server
  Components. `src/lib/auth-client.ts` — `authClient` for Client Components.
- `src/server/db.ts` — the Prisma client.
- `src/trpc` — `client.tsx` (hooks for Client Components), `server.tsx`
  (`trpc`, `prefetch`, `HydrateClient`, `caller` for Server Components).
- `src/env.js` — every environment variable, validated with Zod.
- `src/generated/prisma` — generated client (gitignored); import it as
  `@/generated/prisma/client`.

## Conventions

- Read environment variables through `env` from `@/env`, never
  `process.env` (lint-enforced). Add new ones to the schema in `src/env.js`.
- Components under `src/components` reach the server through tRPC or server
  actions, never by importing `@/server/*` (lint-enforced).
- Import across directories through `@/`, never `../` (lint-enforced).
- Data for a Client Component: `prefetch(trpc.x.y.queryOptions())` in the
  Server Component, wrap the tree in `<HydrateClient>`, read it with
  `useSuspenseQuery(trpc.x.y.queryOptions())` under a `<Suspense>`.
- Invalidate with `queryClient.invalidateQueries(trpc.x.pathFilter())`. The
  classic `api.useUtils()` API from `@trpc/react-query` does not exist here.
- Cache Components is on: code that reads cookies, headers or the session
  must render inside `<Suspense>`. `getSession()` from `@/server/auth`
  already calls `io()`; do the same before reading `Date.now()`, `Math.random()` or
  random IDs in a Server Component, or cache the value with `'use cache'`.
- Type-only imports are a top-level `import type`. `import { type X }` on its
  own survives as a side-effect import and can pull server code into the
  client bundle (lint-enforced).
- Sign-in, sign-up and sign-out go through `authClient`; after any of them,
  clear the query cache (`queryClient.clear()`) so one user's data never
  shows for the next.
- Throw `TRPCError` from procedures. Its message and validation messages in
  Zod schemas are shown to users, so write them as sentences. Any other
  error is logged, and in production reaches the client as a generic
  message.

## Tooling notes

- TypeScript 7 is the native (Go) compiler and has no JavaScript API. In VS
  Code, use the TypeScript Native Preview extension
  (`TypeScriptTeam.native-preview`).
- pnpm refuses releases younger than a day (`minimumReleaseAge`). If an
  install fails on a brand-new version, wait or pick the previous one; do not
  add exclusions.
- oxlint runs type-aware rules through `oxlint-tsgolint`. Fix findings rather
  than disabling them; a disable needs a reason and an exact rule name.
