import { createAuthClient } from 'better-auth/react';

/**
 * The browser side of Better Auth: `signIn`, `signUp`, `signOut` and the
 * `useSession` hook. It calls `/api/auth/*` on the current origin.
 */
export const authClient = createAuthClient();
