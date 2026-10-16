# T3 App

A typesafe full-stack starter: the [T3 Stack](https://create.t3.gg/) on current
releases, with shadcn/ui and the oxc toolchain.

<!-- template-only -->

## Create an app

```bash
pnpm create vichudo-app@latest my-app
```

It copies this template into `my-app`, names the project, writes a `.env`
with a fresh auth secret, creates a git repository and installs dependencies.
Run `pnpm create vichudo-app --help` for options, such as `--ref` to pin a
template version. The CLI lives in [`cli/`](cli).

<!-- /template-only -->

| Layer           | Choice                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org) — App Router, Turbopack, Cache Components, typed routes                             |
| UI              | React 19.3, [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) (Base UI, `base-nova`)     |
| API             | [tRPC 11](https://trpc.io) with the TanStack React Query integration, superjson                                      |
| Database        | [Prisma 7](https://prisma.io) (`prisma-client` generator, `pg` driver adapter), PostgreSQL                           |
| Auth            | [Better Auth](https://www.better-auth.com): email and password, Google ready to switch on                            |
| Validation      | [Zod 4](https://zod.dev), env vars through [`@t3-oss/env-nextjs`](https://env.t3.gg)                                 |
| Language        | [TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) (native compiler), strict       |
| Lint and format | [oxlint](https://oxc.rs/docs/guide/usage/linter) (type-aware) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter) |
| Tests           | [Vitest 5](https://vitest.dev)                                                                                       |
| Tooling         | pnpm 12, Husky + lint-staged, GitHub Actions CI                                                                      |

## Getting started

Requires Node.js 24+ and [Corepack](https://nodejs.org/api/corepack.html)
(`corepack enable`), which installs the pnpm version pinned in `package.json`.

```bash
pnpm install
cp .env.example .env
```

Fill in `.env`:

- `BETTER_AUTH_SECRET`: generate one with `pnpm auth:secret`.
- `BETTER_AUTH_URL`: the app's URL, `http://localhost:3000` locally.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional): see
  [Google sign-in](#google-sign-in). Leave them empty to offer email and
  password only.
- `DATABASE_URL`: a PostgreSQL database. Two local options:
  - `pnpm db:dev` starts a local Prisma Postgres with no Docker. Copy the
    `postgres://` TCP URL it prints.
  - `./start-database.sh` starts PostgreSQL in Docker or Podman, using the
    URL already in `.env`.

Then create the tables and start the app:

```bash
pnpm db:push
pnpm dev
```

Open http://localhost:3000 and create an account. In development the auth
variables are optional, so the app runs before you configure them; a
production build requires `BETTER_AUTH_SECRET`.

## Scripts

| Script                              | What it does                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                          | Dev server with Turbopack                                              |
| `pnpm build` / `pnpm start`         | Production build and server                                            |
| `pnpm check`                        | Format check, lint, typecheck and tests: what CI runs, minus the build |
| `pnpm lint` / `pnpm lint:fix`       | oxlint, with autofixes                                                 |
| `pnpm format` / `pnpm format:check` | oxfmt                                                                  |
| `pnpm typecheck`                    | Generates route types, then runs `tsc`                                 |
| `pnpm test` / `pnpm test:watch`     | Vitest                                                                 |
| `pnpm db:push`                      | Sync the schema to the database without a migration (prototyping)      |
| `pnpm db:migrate`                   | Create and apply a migration in development                            |
| `pnpm db:deploy`                    | Apply pending migrations (production)                                  |
| `pnpm db:generate`                  | Regenerate the Prisma client (also runs on install)                    |
| `pnpm db:studio`                    | Prisma Studio                                                          |
| `pnpm db:dev`                       | Local Prisma Postgres, no Docker                                       |
| `pnpm auth:generate`                | Add the tables Better Auth's config and plugins need to the schema     |
| `pnpm auth:secret`                  | Generate a `BETTER_AUTH_SECRET`                                        |

## Project structure

```text
prisma/schema.prisma        Database schema
prisma.config.ts            Prisma CLI config: schema, migrations, connection URL
src/
  app/                      Routes; page-only components in _components/
    (auth)/                 Sign-in and sign-up pages
    api/auth/[...all]/      Better Auth's endpoints
  components/               Shared components
    ui/                     shadcn/ui, vendored (`pnpm exec shadcn add <name>`)
  env.js                    Validated environment variables
  generated/prisma/         Generated Prisma client (gitignored)
  lib/auth-client.ts        Better Auth for the browser: signIn, signUp, signOut
  server/
    api/routers/            tRPC routers, registered in api/root.ts
    api/trpc.ts             Context, middleware, procedure builders
    auth.ts                 Better Auth config and the cached `getSession()`
    db.ts                   Prisma client
  trpc/
    client.tsx              Provider and `useTRPC()` for Client Components
    server.tsx              `trpc`, `prefetch`, `HydrateClient`, `caller` for RSC
```

## How the pieces fit

**Fetching data.** A Server Component prefetches with
`prefetch(trpc.post.getLatest.queryOptions())` and wraps its subtree in
`<HydrateClient>`. A Client Component below it calls
`useSuspenseQuery(trpc.post.getLatest.queryOptions())` and gets the streamed
result with no extra request. Mutations use
`useMutation(trpc.post.create.mutationOptions())` and invalidate with
`queryClient.invalidateQueries(trpc.post.pathFilter())`.

**Rendering.** Cache Components and Partial Prefetching are on, the defaults
for new Next.js 16.4 apps. Everything outside a `<Suspense>` boundary is
prerendered into a static shell. Request-specific parts, such as the session
panel on the home page, stream in at request time. Opt into caching with
`'use cache'`.

**Auth.** Forms call `authClient` from `@/lib/auth-client`. Server Components
read the session with `getSession()` from `@/server/auth`, once per request.
tRPC reads it from the request headers: `protectedProcedure` rejects callers
without a session and gives procedures a non-null `ctx.session.user`.

## Auth

Email and password works out of the box: `/sign-up` creates an account and
signs it in, and `/sign-in` signs back in. Sessions are stored in the
database.

### Google sign-in

Google is configured but stays off until it has credentials:

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an OAuth client ID of type "Web application".
2. Add the redirect URI `http://localhost:3000/api/auth/callback/google`, plus
   your production URL's equivalent.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

"Continue with Google" then appears on both forms. The sign-in pages are
static, so set the variables before `next build`.

### Extending auth

Better Auth adds features as plugins: two-factor, passkeys, magic links,
organizations, admin. Add one in `src/server/auth.ts` (and its client plugin
in `src/lib/auth-client.ts`), then run `pnpm auth:generate` and
`pnpm db:migrate` for any tables it needs. Password reset and email
verification need an email sender; `src/server/auth.ts` marks where it goes.

## Choices worth knowing about

- **oxlint, not ESLint.** One config (`.oxlintrc.json`) covers the
  `eslint-config-next` rules plus type-aware TypeScript, React, import,
  accessibility and Vitest rules. It also enforces this template's
  boundaries: env access goes through `@/env`, UI never imports `@/server`,
  and imports use `@/` rather than `../`.
- **oxfmt, not Prettier.** Prettier-compatible output. It sorts imports and
  Tailwind classes, including inside `cn()` and `cva()`.
- **TypeScript 7.** `next build` and `tsc` use the native compiler. It has no
  JavaScript API yet, so editors need the
  [TypeScript Native Preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview)
  extension (recommended in `.vscode/extensions.json`).
- **Prisma 7.** The connection URL lives in `prisma.config.ts`, and the client
  connects through `@prisma/adapter-pg`. The generated client is plain
  TypeScript in `src/generated/prisma`.
- **Better Auth, not Auth.js.** Auth.js is now maintained by the Better Auth
  team in security-patch mode, and they recommend Better Auth for new
  projects.
- **pnpm supply-chain defaults.** New releases install only after they are a
  day old. Only the dependencies listed under `allowBuilds` in
  `pnpm-workspace.yaml` may run install scripts.
- **Agent-ready.** `AGENTS.md` (read by `CLAUDE.md`) documents the project's
  conventions under a block that `next dev` keeps in sync with the installed
  Next.js docs. tRPC's own agent skills are linked into `.claude/skills` on
  install, and a Claude Code hook formats every file an agent edits.

## Deploying

Set the variables from `.env.example` in your host, run
`pnpm db:deploy` against the production database, and deploy as any Next.js
app. On [Vercel](https://vercel.com), `prisma generate` runs on install and
`next build` validates the environment. The build loads the auth config, so
`BETTER_AUTH_SECRET` must be available at build time too (Docker: pass it as a
build secret).
