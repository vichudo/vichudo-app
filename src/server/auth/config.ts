import { PrismaAdapter } from '@auth/prisma-adapter';
import type { DefaultSession, NextAuthConfig } from 'next-auth';
import Discord from 'next-auth/providers/discord';

import { db } from '@/server/db';

/**
 * Module augmentation for `next-auth` types: add custom properties to the
 * session while keeping it type-safe.
 *
 * @see https://authjs.dev/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // role: UserRole;
    } & DefaultSession['user'];
  }
}

/**
 * Auth.js options: adapters, providers, callbacks.
 *
 * Providers read their credentials from `AUTH_<PROVIDER>_ID` and
 * `AUTH_<PROVIDER>_SECRET`; declare new ones in `src/env.js`.
 *
 * @see https://authjs.dev/reference/nextjs#config
 */
export const authConfig = {
  providers: [Discord],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;
