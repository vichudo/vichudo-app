/**
 * The tRPC server: context, initialization, and the procedure builders. You
 * edit this file to change the request context (1) or to add a middleware or
 * a new kind of procedure (3). Routers only import the helpers from part 3.
 */
import { setTimeout as sleep } from 'node:timers/promises';

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

import { env } from '@/env';
import { auth, type Session } from '@/server/auth';
import { db } from '@/server/db';

/**
 * 1. CONTEXT
 *
 * What every procedure can reach: the database, the session, the request
 * headers. The route handler and the RSC caller each wrap this helper.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  /** The request's session, when the caller has read it already. */
  session?: Session | null;
}) => {
  const session =
    opts.session === undefined
      ? await auth.api.getSession({ headers: opts.headers })
      : opts.session;

  return {
    db,
    session,
    headers: opts.headers,
  };
};

/**
 * 2. INITIALIZATION
 *
 * Connects the context and the superjson transformer, and surfaces Zod
 * validation errors to the client as a typed, flattened `zodError`.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Keyed by input field, so the client can read `fieldErrors.name`. Only
    // for invalid input: a Zod error inside a procedure (`.output()`, parsing
    // a response) is a bug, and its schema is nobody's business.
    const zodError: z.core.$ZodFlattenedError<Record<string, unknown>> | null =
      error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
        ? z.flattenError(error.cause)
        : null;

    return {
      ...shape,
      // Every INTERNAL_SERVER_ERROR (any error that is not a TRPCError, or
      // one thrown with that code) can carry internals in its message. In
      // production the client gets a generic one; the route handler logs the
      // original.
      message:
        error.code === 'INTERNAL_SERVER_ERROR' && env.NODE_ENV === 'production'
          ? 'Something went wrong. Try again.'
          : shape.message,
      data: { ...shape.data, zodError },
    };
  },
});

/**
 * 3. ROUTERS & PROCEDURES
 *
 * The building blocks for `src/server/api/routers/*`.
 */

/** @see https://trpc.io/docs/server/server-side-calls */
export const createCallerFactory = t.createCallerFactory;

/** @see https://trpc.io/docs/router */
export const createTRPCRouter = t.router;

/**
 * Logs each procedure's duration and, in development, adds 100–500 ms of
 * latency so request waterfalls show up locally the way they will in
 * production.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (env.NODE_ENV === 'development') {
    await sleep(Math.floor(Math.random() * 400) + 100);
  }

  const result = await next();

  console.info(`[tRPC] ${path} took ${Date.now() - start}ms`);

  return result;
});

/**
 * Public procedure: no authentication required. The session is still in
 * `ctx.session` when the caller is signed in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure: rejects callers without a session and narrows
 * `ctx.session.user` to non-null.
 *
 * @see https://trpc.io/docs/server/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Sign in to continue.',
      });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
