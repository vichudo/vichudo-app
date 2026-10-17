import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthForm } from '@/app/(auth)/_components/auth-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isGoogleEnabled } from '@/server/auth';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Welcome back. Use your email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="sign-in" googleEnabled={isGoogleEnabled} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <p>
          No account yet?{' '}
          <Link
            href="/sign-up"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
