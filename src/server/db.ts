import postgres from '@prisma/orm-postgres/runtime';
import { Pool } from 'pg';

import { env } from '@/env';
import type { Contract } from '@/generated/prisma/contract.d';
import contractJson from '@/generated/prisma/contract.json' with { type: 'json' };

const createPool = () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Fail instead of hanging when the database is unreachable or every
    // pooled connection is busy.
    connectionTimeoutMillis: 10_000,
  });
  // A pooled connection that drops while idle emits `error` on the pool;
  // unhandled, it would crash the process.
  pool.on('error', (error) => {
    console.error('Postgres pool:', error);
  });
  return pool;
};

// One pool per process, shared by Prisma and Better Auth. Next.js loads pages
// and route handlers as separate module graphs, and development reloads
// modules: a module-level pool alone would open one for each.
const globalForDb = globalThis as unknown as { pool: Pool | undefined };

export const pool = (globalForDb.pool ??= createPool());

/**
 * The Prisma ORM client, typed by `prisma/contract.prisma`: query models
 * through `db.orm.public.<Model>`.
 *
 * @see https://www.prisma.io/docs/orm/reference/orm-client
 */
export const db = postgres<Contract>({
  contractJson,
  pg: pool,
  // Prisma reports problems only through `log`, silently by default: say, a
  // database whose schema does not match the contract (a migration not run).
  log: console,
});
