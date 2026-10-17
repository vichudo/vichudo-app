import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
import superjson from 'superjson';

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, keep hydrated data fresh briefly so the client does not
        // refetch it immediately after the first render.
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        // Also send queries still in flight, so a server prefetch streams its
        // result into the client component that reads it.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
        // Never swallow errors here: Next.js detects dynamic rendering through
        // errors thrown while prerendering, and it already redacts error
        // messages in production.
        shouldRedactErrors: () => false,
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
