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

const createDb = (pool: Pool) =>
  postgres<Contract>({
    contractJson,
    pg: pool,
    // Prisma reports problems only through `log`, silently by default: say, a
    // database whose schema does not match the contract (a migration not run).
    log: console,
  });

// One pool and one client per process, shared by Prisma and Better Auth.
// Next.js loads pages and route handlers as separate module graphs, and
// development reloads modules: module-level instances alone would make one
// for each.
//
// A changed contract (`pnpm db:push` while `pnpm dev` runs) gets a new client
// on a new pool: clients name prepared statements (`db.prepare`) `pn_1`,
// `pn_2`… on their connections, so two must not share one. The old pool
// closes its idle connections by itself.
const contractKey = JSON.stringify(contractJson);
const globalForDb = globalThis as unknown as {
  db:
    | { key: string; pool: Pool; client: ReturnType<typeof createDb> }
    | undefined;
};
if (globalForDb.db?.key !== contractKey) {
  const pool = createPool();
  globalForDb.db = { key: contractKey, pool, client: createDb(pool) };
}

export const { pool } = globalForDb.db;

/**
 * The Prisma ORM client, typed by `prisma/contract.prisma`: query models
 * through `db.orm.public.<Model>`.
 *
 * @see https://www.prisma.io/docs/orm/reference/orm-client
 */
export const db = globalForDb.db.client;
