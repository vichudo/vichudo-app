import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { env } from '@/env';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

/**
 * Serves tRPC over HTTP for Client Components; Server Components call the
 * router directly through `@/trpc/server`.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    // Unexpected failures always reach the logs, with their stack and cause.
    // Expected ones (invalid input, signed out) only while developing.
    onError({ path, error }) {
      const where = `tRPC failed on ${path ?? '<no-path>'}`;
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        console.error(`${where}:`, error);
        return;
      }
      if (env.NODE_ENV === 'development') {
        console.error(`${where}: ${error.message}`);
      }
    },
  });

export { handler as GET, handler as POST };
