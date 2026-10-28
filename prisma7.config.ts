import { loadEnvConfig } from '@next/env';
import { defineConfig } from '@prisma/prisma7/config';

// Prisma 7's CLI (`prisma7`), kept for what Prisma 8's does not do yet: the
// local Postgres (`pnpm db:dev`) and Studio (`pnpm db:studio`). It reads this
// file instead of the Prisma 8 `prisma.config.ts`. No schema: Prisma 8 owns
// it in `prisma/contract.prisma`.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

export default defineConfig({
  datasource: { url: process.env.DATABASE_URL },
});
