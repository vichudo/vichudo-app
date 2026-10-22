import { TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { describe, expect, it, vi } from 'vitest';

import {
  createTRPCContext,
  createTRPCRouter,
  publicProcedure,
} from '@/server/api/trpc';
import { auth } from '@/server/auth';

vi.mock('@/server/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn<() => Promise<null>>(() => Promise.resolve(null)),
    },
  },
}));

// Error messages differ in production, the environment that matters here.
vi.mock('@/env', () => ({ env: { NODE_ENV: 'production' } }));

describe('createTRPCContext', () => {
  it('reads the session from the request headers', async () => {
    vi.mocked(auth.api.getSession).mockClear();
    const headers = new Headers({ cookie: 'session=1' });

    const ctx = await createTRPCContext({ headers });

    expect(auth.api.getSession).toHaveBeenCalledWith({ headers });
    expect(ctx.session).toBeNull();
    expect(ctx.headers).toBe(headers);
  });

  it('reuses a session the caller has read already', async () => {
    vi.mocked(auth.api.getSession).mockClear();

    const ctx = await createTRPCContext({
      headers: new Headers(),
      session: null,
    });

    expect(auth.api.getSession).not.toHaveBeenCalled();
    expect(ctx.session).toBeNull();
  });
});

describe('error messages sent to clients', () => {
  const router = createTRPCRouter({
    crash: publicProcedure.query(() => {
      throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
    }),
    refuse: publicProcedure.query(() => {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your post.' });
    }),
  });

  /** Calls a query over HTTP, as a Client Component would. */
  async function errorMessage(path: string) {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: new Request(`http://localhost/api/trpc/${path}`),
      router,
      createContext: () =>
        createTRPCContext({ headers: new Headers(), session: null }),
    });
    const body = (await response.json()) as {
      error: { json: { message: string } };
    };
    return body.error.json.message;
  }

  it('hides the cause of an unexpected error', async () => {
    await expect(errorMessage('crash')).resolves.toBe(
      'Something went wrong. Try again.',
    );
  });

  it("keeps a procedure's own message", async () => {
    await expect(errorMessage('refuse')).resolves.toBe('Not your post.');
  });
});
