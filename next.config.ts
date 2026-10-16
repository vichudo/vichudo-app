import type { NextConfig } from 'next';

// Validate environment variables at build and dev start. Set
// `SKIP_ENV_VALIDATION=1` to skip it (Docker, CI).
import './src/env.js';

const config: NextConfig = {
  // Cache Components: dynamic by default, cache opt-in with `'use cache'`, and
  // a static shell prerendered around every <Suspense> boundary.
  // https://nextjs.org/docs/app/getting-started/caching
  cacheComponents: true,
  partialPrefetching: true,
  // Type-check `<Link href>`, `router.push` and `redirect` against the routes.
  typedRoutes: true,
};

export default config;
