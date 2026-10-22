import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>There is nothing at this address.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button nativeButton={false} render={<Link href="/" />}>
            Go home
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
