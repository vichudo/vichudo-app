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

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Passwords need at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="sign-up" googleEnabled={isGoogleEnabled} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <p>
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
