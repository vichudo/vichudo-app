import { ArrowUpRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { LatestPost, LatestPostSkeleton } from '@/app/_components/latest-post';
import { SignOutButton } from '@/app/_components/sign-out-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSession } from '@/server/auth';
import { caller, HydrateClient, prefetch, trpc } from '@/trpc/server';

const links = [
  {
    // This template's own guide: T3's first steps set up NextAuth and Docker.
    href: 'https://github.com/vichudo/vichudo-app#how-do-i',
    title: 'First steps',
    description: 'Add an endpoint, change the database, turn on Google.',
  },
  {
    href: 'https://create.t3.gg/en/introduction',
    title: 'Documentation',
    description: 'The libraries in this stack, and how to deploy it.',
  },
] as const;

// Everything outside <Suspense> is prerendered into the static shell; the
// session panel reads cookies, so it streams in at request time.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary">
            Next.js 16 · tRPC 11 · Prisma 7 · Tailwind 4
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Create T3 App
          </h1>
          <p className="max-w-prose text-lg text-pretty text-muted-foreground">
            A typesafe full-stack starter with shadcn/ui, Better Auth, and oxc
            tooling.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <nav className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Card
            key={link.href}
            className="relative transition-colors hover:bg-muted/50"
          >
            <CardHeader>
              <CardTitle>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 after:absolute after:inset-0"
                >
                  {link.title}
                  <ArrowUpRightIcon className="size-4" aria-hidden />
                </a>
              </CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </nav>

      <Suspense fallback={<SessionSkeleton />}>
        <SessionPanel />
      </Suspense>
    </main>
  );
}

async function SessionPanel() {
  const [session, hello] = await Promise.all([
    getSession(),
    caller.post.hello({ text: 'from tRPC' }),
  ]);

  if (session) prefetch(trpc.post.getLatest.queryOptions());

  return (
    <HydrateClient>
      <Card>
        <CardHeader>
          <CardTitle>{hello.greeting}</CardTitle>
          <CardDescription>
            {session
              ? `Signed in as ${session.user.name}.`
              : 'Sign in to create posts.'}
          </CardDescription>
        </CardHeader>

        {session && (
          <CardContent>
            <Suspense fallback={<LatestPostSkeleton />}>
              <LatestPost />
            </Suspense>
          </CardContent>
        )}

        <CardFooter className="justify-end gap-2">
          {session ? (
            <SignOutButton />
          ) : (
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Sign in
              </Button>
              <Button nativeButton={false} render={<Link href="/sign-up" />}>
                Create account
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </HydrateClient>
  );
}

function SessionSkeleton() {
  return (
    <Card aria-busy>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardFooter className="justify-end">
        <Skeleton className="h-8 w-40" />
      </CardFooter>
    </Card>
  );
}
