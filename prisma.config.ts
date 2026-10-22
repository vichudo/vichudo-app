import { loadEnvConfig } from '@next/env';
import { defineConfig as defineOrmConfig } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from 'prisma/config';

// The Prisma CLI does not read `.env` files. Load them the way Next.js does,
// so `.env.local` overrides `.env` here exactly as it does in the app.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

export default definePrismaConfig({
  orm: defineOrmConfig({
    contract: 'prisma/contract.prisma',
    // `prisma contract emit` writes contract.json and contract.d.ts here.
    output: 'src/generated/prisma',
    migrations: { dir: 'prisma/migrations' },
    db: {
      // Read directly: `contract emit` runs on every install (CI, Vercel) and
      // needs no database. Commands that do need one report it missing.
      connection: process.env.DATABASE_URL,
    },
  }),
  // pnpm links the Prisma agent skills into `.claude/skills` (see
  // pnpm-workspace.yaml); Prisma's own `skills sync` is not used.
  skills: { check: false },
});
