import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'prisma/config';

// The Prisma CLI does not read `.env` files. Load them the way Next.js does,
// so `.env.local` overrides `.env` here exactly as it does in the app.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Read directly rather than through Prisma's `env()`, which throws when the
    // variable is unset: `prisma generate` runs on every install (CI, Vercel)
    // and needs no database. Commands that do need one report it missing.
    url: process.env.DATABASE_URL,
    // `prisma migrate dev` diffs against a scratch database. `pnpm db:dev`
    // serves one on its own port; elsewhere Prisma creates it on demand.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
