import 'server-only';
import {
  dehydrate,
  HydrationBoundary,
  noop,
  type QueryExecuteOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { headers } from 'next/headers';
import { cache } from 'react';

import { appRouter, createCaller } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { makeQueryClient } from '@/trpc/query-client';

/**
 * The tRPC context for a React Server Component render, created once per
 * request.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set('x-trpc-source', 'rsc');

  return createTRPCContext({ headers: heads });
});

/** One query client per request, shared by every prefetch in the render. */
export const getQueryClient = cache(makeQueryClient);

/**
 * Query options for Server Components: `trpc.post.getLatest.queryOptions()`
 * resolves on the server and hydrates into the matching client query.
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: getQueryClient,
});

/**
 * Calls procedures directly, bypassing the query cache. Use it when only the
 * server needs the data; prefer `prefetch` when a client component reads it.
 */
export const caller = createCaller(createContext);

/** Sends this request's prefetched queries to the client components below. */
export function HydrateClient({ children }: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}

/**
 * Starts a query on the server without waiting for it. Its result streams to
 * the client component that reads it inside a `<HydrateClient>`.
 *
 * @example prefetch(trpc.post.getLatest.queryOptions());
 */
export function prefetch<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
>(
  queryOptions: QueryExecuteOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
) {
  // A failure is not lost: it is dehydrated with the query and rethrown by
  // the client component that reads it, into the nearest error boundary.
  void getQueryClient().query(queryOptions).catch(noop);
}
