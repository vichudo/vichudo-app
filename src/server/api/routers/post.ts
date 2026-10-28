import { z } from 'zod';

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => ({
      greeting: `Hello ${input.text}`,
    })),

  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, 'Give your post a title.')
          .max(256, 'Keep the title under 256 characters.'),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.orm.public.Post.create({
        name: input.name,
        createdById: ctx.session.user.id,
      }),
    ),

  getLatest: protectedProcedure.query(({ ctx }) =>
    ctx.db.orm.public.Post.where({ createdById: ctx.session.user.id })
      .orderBy((post) => post.createdAt.desc())
      .first(),
  ),

  getSecretMessage: protectedProcedure.query(
    () => 'you can now see this secret message!',
  ),
});
