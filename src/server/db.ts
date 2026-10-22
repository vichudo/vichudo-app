import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '@/env';
import { PrismaClient } from '@/generated/prisma/client';

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      // Fail instead of hanging when the database is unreachable or every
      // pooled connection is busy (Prisma 6 gave up after 5–10 s too).
      connectionTimeoutMillis: 10_000,
    }),
    log:
      env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// One client, and one connection pool, per process. Next.js loads pages and
// route handlers as separate module graphs, and development reloads modules:
// a module-level client alone would open a pool for each.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = (globalForPrisma.prisma ??= createPrismaClient());
