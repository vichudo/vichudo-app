# T3 App

A typesafe full-stack app: Next.js 16, tRPC, Prisma, Better Auth, Tailwind CSS
and shadcn/ui, checked by TypeScript 7, oxlint and oxfmt.

<!-- template-only -->

## Create an app

```bash
pnpm create vichudo-app@latest my-app
```

That is the whole setup. It copies this template, names the project, gives
it its own local database, writes a `.env` with a fresh auth secret, fetches
the latest shadcn/ui components, creates a git repository and installs
dependencies. Then follow the steps it prints, which are
[Quick start](#quick-start) without the first two commands.

It asks one question: all shadcn/ui components, or just the essentials the
template's pages use. Either way they come fresh from the registry, so a new
app never starts with stale copies. This repository keeps only the
essentials.

`pnpm create vichudo-app --help` lists the options, such as `--components`
and `--ref` to pin a template version. The CLI's source is in
[`cli/`](cli).

<!-- /template-only -->

## Quick start

You need [Node.js 24+](https://nodejs.org) (`nvm use` or `fnm use` reads
`.nvmrc`) and pnpm (`corepack enable` provides the exact version this
project pins).

```bash
pnpm install
pnpm env:init    # creates .env with a fresh secret
pnpm db:dev      # starts a local Postgres (no Docker); leave it running
```

In a second terminal:

```bash
pnpm db:push     # creates the tables
pnpm dev         # starts the app
```

Open http://localhost:3000, create an account, and write a post.

> **Working on several apps?** Each one has its own local database, but only
> one `pnpm db:dev` can run at a time: stop the other with Ctrl+C first.

## Everyday commands

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `pnpm dev`        | Starts the app with hot reload                                 |
| `pnpm db:dev`     | Starts the local database                                      |
| `pnpm check`      | Format, lint, typecheck and test: run it before you push       |
| `pnpm format`     | Formats every file (your editor and the commit hook do it too) |
| `pnpm lint:fix`   | Applies lint autofixes                                         |
| `pnpm db:push`    | Syncs the database with `prisma/schema.prisma`, no migration   |
| `pnpm db:migrate` | Creates and applies a migration, once you have data to keep    |
| `pnpm db:studio`  | Browses the database in Prisma Studio                          |
| `pnpm test`       | Runs the tests (`pnpm test:watch` keeps them running)          |
| `pnpm build`      | Builds for production                                          |

<details>
<summary>All other scripts</summary>

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `pnpm start`         | Serves the production build                           |
| `pnpm preview`       | Builds, then serves                                   |
| `pnpm typecheck`     | Generates route types, then runs `tsc`                |
| `pnpm format:check`  | Checks formatting without writing                     |
| `pnpm lint`          | oxlint, type-aware                                    |
| `pnpm db:deploy`     | Applies pending migrations (production)               |
| `pnpm db:generate`   | Regenerates the Prisma client (runs on install)       |
| `pnpm auth:generate` | Adds the tables Better Auth's config and plugins need |
| `pnpm auth:secret`   | Prints a new `BETTER_AUTH_SECRET`                     |
| `pnpm env:init`      | Creates `.env` from `.env.example` if it is missing   |

</details>

## How do I…

### Add an API endpoint

Add a procedure to a router in `src/server/api/routers/`:

```ts
// src/server/api/routers/post.ts
export const postRouter = createTRPCRouter({
  // …
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db.post.findUnique({ where: { id: input.id } }),
    ),
});
```

Register a new router in `src/server/api/root.ts`. Use `protectedProcedure`
instead of `publicProcedure` to require a signed-in user; it gives you
`ctx.session.user`.

### Show data on a page

Prefetch in a Server Component, read the data in a Client Component:

```tsx
// src/app/posts/[id]/page.tsx
import { Suspense } from 'react';

import { PostTitle } from '@/app/posts/[id]/_components/post-title';
import { Skeleton } from '@/components/ui/skeleton';
import { HydrateClient, prefetch, trpc } from '@/trpc/server';

export default function PostPage({ params }: PageProps<'/posts/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-6 w-48" />}>
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: Pick<PageProps<'/posts/[id]'>, 'params'>) {
  const id = Number((await params).id);
  prefetch(trpc.post.byId.queryOptions({ id }));
  return (
    <HydrateClient>
      <PostTitle id={id} />
    </HydrateClient>
  );
}
```

```tsx
// src/app/posts/[id]/_components/post-title.tsx
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { useTRPC } from '@/trpc/client';

export function PostTitle({ id }: { id: number }) {
  const trpc = useTRPC();
  const { data: post } = useSuspenseQuery(trpc.post.byId.queryOptions({ id }));
  return <h1>{post?.name ?? 'Post not found'}</h1>;
}
```

Anything that reads request data (params, cookies, the session) renders
inside `<Suspense>`: the rest of the page is prerendered and served
instantly. For a mutation, see `src/app/_components/latest-post.tsx`.

### Change the database

Edit `prisma/schema.prisma`, then run `pnpm db:push` while prototyping, or
`pnpm db:migrate` to record a migration once there is data to keep. Either
regenerates the Prisma client.

### Add a UI component

Components live in `src/components/ui`. If yours isn't there yet, add it
from the [shadcn/ui registry](https://ui.shadcn.com/docs/components), then
import it:

```bash
pnpm exec shadcn add dialog
```

```tsx
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
```

The same command with `--overwrite` updates a component to its latest
version (review the diff: the code is yours). `pnpm format` puts new files
in the house style.

### Check who is signed in

- **Server Component** (inside `<Suspense>`): `await getSession()` from
  `@/server/auth`, which returns `null` when signed out.
- **tRPC procedure:** use `protectedProcedure`; `ctx.session.user` is set.
- **Client Component:** `authClient.useSession()` from `@/lib/auth-client`.

### Add an environment variable

Declare it in `src/env.js` (server-only, or `NEXT_PUBLIC_` for the browser),
add it to `.env.example` so teammates know about it, then read `env.MY_VAR`
from `@/env`. Reading `process.env` directly is a lint error, so a missing
variable fails the build instead of a request.

### Turn on Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an OAuth client ID of type "Web application", with the redirect URI
   `http://localhost:3000/api/auth/callback/google` (add your production
   URL's equivalent too).
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, and restart
   `pnpm dev`.

"Continue with Google" then appears on the sign-in and sign-up pages.

### Add more auth features

Better Auth adds features as plugins: two-factor, passkeys, magic links,
organizations, admin ([list](https://www.better-auth.com/docs/plugins/2fa)).
Add the plugin in `src/server/auth.ts` and its client plugin in
`src/lib/auth-client.ts`, then run `pnpm auth:generate` and `pnpm db:push`
for any tables it needs. Password reset and email verification need an email
sender; the spot is marked in `src/server/auth.ts`.

### Deploy

On [Vercel](https://vercel.com), import the repository, add a PostgreSQL
database (for example Neon, from the Vercel Marketplace), and set:

- `DATABASE_URL`: the production database.
- `BETTER_AUTH_SECRET`: a new one from `pnpm auth:secret` (the build needs it
  too).
- `BETTER_AUTH_URL`: the production URL.

Then apply your migrations with `pnpm db:deploy`. Anywhere else, deploy it as
any Next.js app.

## Project structure

```text
prisma/schema.prisma          Database schema
src/
  app/                        Routes: pages, layouts, API endpoints
    (auth)/                   Sign-in and sign-up pages
    _components/              Components used only by the home page
  components/                 Shared components
    ui/                       shadcn/ui (vendored)
  lib/auth-client.ts          Auth for Client Components
  server/
    api/routers/              tRPC routers
    api/trpc.ts               Context, middleware, procedure builders
    auth.ts                   Better Auth config and getSession()
    db.ts                     Prisma client
  trpc/                       tRPC for Client (client.tsx) and Server (server.tsx) Components
  env.js                      Validated environment variables
```

## Editor setup

Open the folder in VS Code and accept the recommended extensions: oxc (format
on save, lint fixes), TypeScript Native Preview (TypeScript 7), Tailwind CSS
and Prisma. Coding agents read `AGENTS.md`, and Claude Code formats every
file it edits.

## What's inside

| Layer           | Choice                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org): App Router, Turbopack, Cache Components, typed routes                 |
| UI              | React 19.3, [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) on Base UI    |
| API             | [tRPC 11](https://trpc.io) with TanStack Query and superjson                                            |
| Database        | [Prisma 7](https://prisma.io) and PostgreSQL; `prisma dev` locally                                      |
| Auth            | [Better Auth](https://www.better-auth.com): email and password, Google ready                            |
| Validation      | [Zod 4](https://zod.dev); environment variables through [`@t3-oss/env-nextjs`](https://env.t3.gg)       |
| Language        | [TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), strict            |
| Lint and format | [oxlint](https://oxc.rs/docs/guide/usage/linter) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter) |
| Tests           | [Vitest 5](https://vitest.dev)                                                                          |
| Tooling         | pnpm 12, Husky + lint-staged, GitHub Actions CI                                                         |

<details>
<summary>Why these choices</summary>

- **Rendering.** Cache Components and Partial Prefetching are on, the
  defaults for new Next.js 16.4 apps. Everything outside a `<Suspense>`
  boundary is prerendered into a static shell; request-specific parts stream
  in at request time. Opt into caching with `'use cache'`.
- **Better Auth, not Auth.js.** Auth.js is maintained by the Better Auth team
  in security-patch mode, and they recommend Better Auth for new projects.
- **oxlint and oxfmt, not ESLint and Prettier.** Much faster, one config
  each. The lint config also guards boundaries: environment access goes
  through `@/env`, UI never imports `@/server`, and imports use `@/` rather
  than `../`.
- **TypeScript 7.** The native compiler type-checks this project in about
  half a second. It has no JavaScript API yet, hence the editor extension.
- **Prisma 7.** The connection URL lives in `prisma.config.ts`; the client
  connects through `@prisma/adapter-pg` and is generated into
  `src/generated/prisma`. `pnpm db:dev` runs
  [Prisma Postgres locally](https://www.prisma.io/docs/postgres/database/local-development).
- **pnpm supply-chain defaults.** New releases install only once they are a
  day old, and only the packages listed in `pnpm-workspace.yaml` may run
  install scripts.

</details>
