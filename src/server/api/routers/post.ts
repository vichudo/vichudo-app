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
      ctx.db.post.create({
        data: {
          name: input.name,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      }),
    ),

  getLatest: protectedProcedure.query(({ ctx }) =>
    ctx.db.post.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { createdBy: { id: ctx.session.user.id } },
    }),
  ),

  getSecretMessage: protectedProcedure.query(
    () => 'you can now see this secret message!',
  ),
});
