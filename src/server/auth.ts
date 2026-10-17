import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { io } from 'next/cache';
import { headers } from 'next/headers';
import { cache } from 'react';

import { env } from '@/env';
import { db } from '@/server/db';

/** Google sign-in is configured, but only turns on once both keys are set. */
const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : undefined;

/**
 * Better Auth: email and password by default, Google when configured.
 * After changing options or plugins that add tables, regenerate the schema
 * (see README → Auth).
 *
 * @see https://www.better-auth.com/docs/reference/options
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    // Password reset needs an email sender, e.g. Resend:
    // sendResetPassword: async ({ user, url }) => { ... },
  },
  socialProviders: google ? { google } : {},
  // Must stay last: lets server actions set the session cookie.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/** Whether the sign-in pages should offer "Continue with Google". */
export const isGoogleEnabled = google !== undefined;

/**
 * The current session in Server Components, read once per request.
 *
 * Cache Components only allows random values (session tokens, CSRF state) at
 * request time: `io()` keeps the read out of prerenders and resolves
 * immediately during a request.
 */
export const getSession = cache(async () => {
  await io();
  return auth.api.getSession({ headers: await headers() });
});
