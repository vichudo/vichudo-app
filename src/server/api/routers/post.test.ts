import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';

import { createCaller } from '@/server/api/root';
import type { createTRPCContext } from '@/server/api/trpc';

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const now = new Date();
const session: NonNullable<Context['session']> = {
  user: {
    id: 'user_1',
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  },
  session: {
    id: 'session_1',
    token: 'token_1',
    userId: 'user_1',
    expiresAt: new Date(now.getTime() + 60_000),
    createdAt: now,
    updatedAt: now,
  },
};

/** A caller over a stubbed database: procedures run without Postgres. */
function setup({ signedIn }: { signedIn: boolean }) {
  const first = vi.fn<() => Promise<null>>(() => Promise.resolve(null));
  const Post = {
    create: vi.fn<
      (row: { name: string; createdById: string }) => Promise<{ name: string }>
    >((row) => Promise.resolve({ name: row.name })),
    where: vi.fn<
      (filter: { createdById: string }) => {
        orderBy: () => { first: typeof first };
      }
    >(() => ({ orderBy: () => ({ first }) })),
  };
  const caller = createCaller({
    db: { orm: { public: { Post } } } as unknown as Context['db'],
    session: signedIn ? session : null,
    headers: new Headers(),
  });
  return { caller, Post, first };
}

describe('post router', () => {
  it('greets without a session', async () => {
    const { caller } = setup({ signedIn: false });

    await expect(caller.post.hello({ text: 'tests' })).resolves.toEqual({
      greeting: 'Hello tests',
    });
  });

  it('rejects protected procedures without a session', async () => {
    const { caller, first } = setup({ signedIn: false });

    await expect(caller.post.getLatest()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(first).not.toHaveBeenCalled();
  });

  it('validates input before touching the database', async () => {
    const { caller, Post } = setup({ signedIn: true });

    await expect(caller.post.create({ name: '   ' })).rejects.toBeInstanceOf(
      TRPCError,
    );
    expect(Post.create).not.toHaveBeenCalled();
  });

  it('creates a post owned by the signed-in user', async () => {
    const { caller, Post } = setup({ signedIn: true });

    await caller.post.create({ name: '  First post ' });

    expect(Post.create).toHaveBeenCalledWith({
      name: 'First post',
      createdById: 'user_1',
    });
  });

  it("reads only the signed-in user's posts", async () => {
    const { caller, Post, first } = setup({ signedIn: true });

    await expect(caller.post.getLatest()).resolves.toBeNull();

    expect(Post.where).toHaveBeenCalledWith({ createdById: 'user_1' });
    expect(first).toHaveBeenCalledOnce();
  });
});
