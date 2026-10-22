'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Suspense, use, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

const FALLBACK_ERROR = 'Something went wrong. Try again.';
// The request never completed: offline, or the server went away.
const NETWORK_ERROR = 'Could not reach the server. Check your connection.';

/** Reads a text field from a submitted form; file inputs are not expected. */
function textField(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: Mode;
  /** Resolved on the server at request time (see `isGoogleEnabled`). */
  googleEnabled: Promise<boolean>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = textField(form, 'email');
    const password = textField(form, 'password');

    setError(null);
    startTransition(async () => {
      try {
        const result =
          mode === 'sign-up'
            ? await authClient.signUp.email({
                name: textField(form, 'name'),
                email,
                password,
              })
            : await authClient.signIn.email({ email, password });

        if (result.error) {
          setError(result.error.message || FALLBACK_ERROR);
          return;
        }
      } catch {
        setError(NETWORK_ERROR);
        return;
      }
      // Next keeps this page mounted, hidden, after navigating away: clear
      // the credentials so they never reappear, for this user or the next.
      formElement.reset();
      // Drop anything cached for the previous visitor. The navigation renders
      // the home page's dynamic parts fresh, with the new session cookie.
      queryClient.clear();
      router.replace('/');
    });
  }

  return (
    <form onSubmit={onSubmit} aria-busy={pending}>
      <FieldGroup>
        {mode === 'sign-up' && (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === 'sign-up' ? 'new-password' : 'current-password'
            }
            minLength={mode === 'sign-up' ? 8 : undefined}
            required
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {mode === 'sign-up' ? 'Create account' : 'Sign in'}
        </Button>
        {/* Only this part waits for the request; the form is static. */}
        <Suspense fallback={null}>
          <GoogleSignIn
            enabled={googleEnabled}
            disabled={pending}
            onError={setError}
          />
        </Suspense>
      </FieldGroup>
    </form>
  );
}

function GoogleSignIn({
  enabled,
  disabled,
  onError,
}: {
  enabled: Promise<boolean>;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  if (!use(enabled)) return null;

  return (
    <>
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
        or
      </FieldSeparator>
      <GoogleButton disabled={disabled} onError={onError} />
    </>
  );
}

function GoogleButton({
  disabled,
  onError,
}: {
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          // Redirects to Google, then back to `callbackURL`. It only returns
          // when the redirect could not start.
          try {
            const { error } = await authClient.signIn.social({
              provider: 'google',
              callbackURL: '/',
            });
            if (error) onError(error.message || FALLBACK_ERROR);
          } catch {
            onError(NETWORK_ERROR);
          }
        })
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden data-icon="inline-start">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
