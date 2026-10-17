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
    onError:
      env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
