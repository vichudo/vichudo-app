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
 * with `pnpm auth:generate` (see README → Add more auth features).
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
  // `next dev` moves to the next free port when 3000 is taken: accept any
  // local port while developing, so sign-in is not refused as cross-origin.
  trustedOrigins:
    env.NODE_ENV === 'development'
      ? ['http://localhost:*', 'http://127.0.0.1:*']
      : undefined,
  // Must stay last: lets server actions set the session cookie.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Whether the sign-in pages should offer "Continue with Google". Resolved at
 * request time, so an app built without the keys (Docker, CI) follows the
 * environment it runs in rather than the one it was built in.
 */
export async function isGoogleEnabled() {
  await io();
  return google !== undefined;
}

/**
 * The current session in Server Components, read once per request.
 *
 * Cache Components only allows random values (session tokens, CSRF state) at
 * request time: `io()` keeps the read out of prerenders and resolves
 * immediately during a request.
 *
 * A render cannot set cookies, so it does not extend the session either:
 * that would push back the database expiry while the cookie keeps its old
 * one. Route handlers (tRPC, `/api/auth`) refresh both.
 */
export const getSession = cache(async () => {
  await io();
  return auth.api.getSession({
    headers: await headers(),
    query: { disableRefresh: true },
  });
});
