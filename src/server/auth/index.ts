import NextAuth from 'next-auth';
import { io } from 'next/cache';
import { cache } from 'react';

import { authConfig } from '@/server/auth/config';

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * The current session, read once per request and shared by every layout,
 * page and tRPC call that asks for it.
 *
 * Auth.js generates random values (CSRF tokens) while reading a session, and
 * Cache Components only allows those at request time: `io()` keeps the read
 * out of prerenders and resolves immediately during a request.
 */
const auth = cache(async () => {
  await io();
  return uncachedAuth();
});

export { auth, handlers, signIn, signOut };
