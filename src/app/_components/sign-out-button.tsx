'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          let failure: string | undefined;
          try {
            const { error } = await authClient.signOut();
            if (error) failure = error.message || 'Try again.';
          } catch {
            failure = 'Could not reach the server. Check your connection.';
          }
          if (failure !== undefined) {
            toast.add({
              type: 'error',
              title: 'Could not sign out',
              description: failure,
            });
            return;
          }
          // A full page load, not a client navigation: it drops the query
          // cache and the routes Next keeps mounted in the background, so the
          // next visitor on this device never sees this user's data or forms.
          window.location.assign('/');
        })
      }
    >
      {pending && <Spinner data-icon="inline-start" />}
      Sign out
    </Button>
  );
}
