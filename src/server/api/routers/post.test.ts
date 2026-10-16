import { TRPCError } from '@trpc/server';
import type { Session } from 'next-auth';
import { describe, expect, it, vi } from 'vitest';

import { createCaller } from '@/server/api/root';
import type { createTRPCContext } from '@/server/api/trpc';

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const session: Session = {
  user: { id: 'user_1', name: 'Ada' },
  expires: new Date(Date.now() + 60_000).toISOString(),
};

/** A caller over a stubbed database: procedures run without Postgres. */
function setup({ signedIn }: { signedIn: boolean }) {
  const db = {
    post: {
      create: vi.fn<
        (args: { data: { name: string } }) => Promise<{ name: string }>
      >(({ data }) => Promise.resolve({ name: data.name })),
      findFirst: vi.fn<() => Promise<null>>(() => Promise.resolve(null)),
    },
  };
  const caller = createCaller({
    db: db as unknown as Context['db'],
    session: signedIn ? session : null,
    headers: new Headers(),
  });
  return { caller, db };
}

describe('post router', () => {
  it('greets without a session', async () => {
    const { caller } = setup({ signedIn: false });

    await expect(caller.post.hello({ text: 'tests' })).resolves.toEqual({
      greeting: 'Hello tests',
    });
  });

  it('rejects protected procedures without a session', async () => {
    const { caller, db } = setup({ signedIn: false });

    await expect(caller.post.getLatest()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(db.post.findFirst).not.toHaveBeenCalled();
  });

  it('validates input before touching the database', async () => {
    const { caller, db } = setup({ signedIn: true });

    await expect(caller.post.create({ name: '   ' })).rejects.toBeInstanceOf(
      TRPCError,
    );
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it('creates a post owned by the signed-in user', async () => {
    const { caller, db } = setup({ signedIn: true });

    await caller.post.create({ name: '  First post ' });

    expect(db.post.create).toHaveBeenCalledWith({
      data: {
        name: 'First post',
        createdBy: { connect: { id: 'user_1' } },
      },
    });
  });
});
