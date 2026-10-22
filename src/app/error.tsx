'use client';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Shown when a page throws while rendering: a query a client component reads
 * failed, or an error escaped a transition. The root layout stays mounted.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  // A query that failed stays in the cache as an error; without a reset, its
  // component would throw it again instead of fetching.
  const { reset } = useQueryErrorResetBoundary();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            This page could not load. Try again, or come back in a moment.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button
            type="button"
            onClick={() => {
              reset();
              retry();
            }}
          >
            Try again
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
