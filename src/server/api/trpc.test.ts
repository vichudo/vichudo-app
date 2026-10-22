import { describe, expect, it, vi } from 'vitest';

import { createTRPCContext } from '@/server/api/trpc';
import { auth } from '@/server/auth';

vi.mock('@/server/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn<() => Promise<null>>(() => Promise.resolve(null)),
    },
  },
}));

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
