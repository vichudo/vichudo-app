import { postRouter } from '@/server/api/routers/post';
import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';

/**
 * The app's root router. Add every router from `src/server/api/routers`
 * here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
});

export type AppRouter = typeof appRouter;

/**
 * A server-side caller for the tRPC API.
 *
 * @example
 * const caller = createCaller(createContext);
 * const latest = await caller.post.getLatest();
 */
export const createCaller = createCallerFactory(appRouter);
