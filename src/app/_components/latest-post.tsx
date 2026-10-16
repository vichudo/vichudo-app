'use client';

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/trpc/client';

export function LatestPost() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // Prefetched on the server, so this resolves without a client round trip.
  const { data: latestPost } = useSuspenseQuery(
    trpc.post.getLatest.queryOptions(),
  );
  const [name, setName] = useState('');

  const createPost = useMutation(
    trpc.post.create.mutationOptions({
      onSuccess: async (post) => {
        await queryClient.invalidateQueries(trpc.post.pathFilter());
        setName('');
        toast.add({ title: 'Post created', description: post.name });
      },
    }),
  );

  const nameError = createPost.error?.data?.zodError?.fieldErrors.name?.[0];

  return (
    <div className="flex flex-col gap-4">
      <p className="truncate text-sm text-muted-foreground">
        {latestPost
          ? `Your most recent post: ${latestPost.name}`
          : 'You have no posts yet.'}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createPost.mutate({ name });
        }}
      >
        <Field data-invalid={Boolean(nameError)}>
          <FieldLabel htmlFor="post-name">Title</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="post-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(nameError)}
              placeholder="My first post"
            />
            <Button type="submit" disabled={createPost.isPending}>
              {createPost.isPending && <Spinner data-icon="inline-start" />}
              Submit
            </Button>
          </div>
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>
      </form>
    </div>
  );
}

export function LatestPostSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
