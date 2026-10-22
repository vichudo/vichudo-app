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
// for each. Two clients on one pool would also clash, since each names its
// prepared statements `pn_1`, `pn_2`… on the same connections.
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: { storageHash: string; client: ReturnType<typeof createDb> } | undefined;
};

export const pool = (globalForDb.pool ??= createPool());

// A new client when the contract changes, so `pnpm db:push` reaches a running
// `pnpm dev`.
const { storageHash } = contractJson.storage;
if (globalForDb.db?.storageHash !== storageHash) {
  globalForDb.db = { storageHash, client: createDb(pool) };
}

/**
 * The Prisma ORM client, typed by `prisma/contract.prisma`: query models
 * through `db.orm.public.<Model>`.
 *
 * @see https://www.prisma.io/docs/orm/reference/orm-client
 */
export const db = globalForDb.db.client;
