# create-vichudo-app

Create a typesafe full-stack app from the
[vichudo/t3-latest](https://github.com/vichudo/t3-latest) template.

```bash
pnpm create vichudo-app@latest my-app
# or
npm create vichudo-app@latest my-app
```

You get Next.js 16, tRPC 11, Prisma 7, Better Auth (email and password, Google
ready), Tailwind CSS 4, shadcn/ui, TypeScript 7, oxlint and oxfmt. The command:

1. copies the latest template into `my-app`,
2. names the package after the directory,
3. gives it its own local database (`pnpm db:dev`, no Docker) on free ports,
   and writes `.env` with a fresh `BETTER_AUTH_SECRET` pointing at it,
4. creates a git repository with a first commit,
5. installs dependencies with pnpm.

Then:

```bash
cd my-app
pnpm db:dev                # local Postgres, leave it running
pnpm db:push && pnpm dev   # in a second terminal
```

Requires Node.js 24+ and git. pnpm is used through Corepack if it is not
installed.

## Options

| Option                | Effect                                                |
| --------------------- | ----------------------------------------------------- |
| `--ref <branch\|tag>` | Template version to use (default: the default branch) |
| `--template <url>`    | Git URL or path of another template, e.g. a fork      |
| `--no-install`        | Skip `pnpm install`                                   |
| `--no-git`            | Skip `git init` and the first commit                  |
| `-y`, `--yes`         | Accept defaults without prompting                     |
