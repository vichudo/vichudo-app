'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { error } = await authClient.signOut();
          if (error) {
            toast.add({
              type: 'error',
              title: 'Could not sign out',
              description: error.message || 'Try again.',
            });
            return;
          }
          // The browser keeps one query cache; clear it so the next visitor on
          // this device never sees the previous user's data.
          queryClient.clear();
          router.refresh();
        })
      }
    >
      {pending && <Spinner data-icon="inline-start" />}
      Sign out
    </Button>
  );
}
