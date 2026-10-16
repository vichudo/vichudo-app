import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolve the `@/*` alias from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // Tests run outside React Server Components, where `server-only` throws
      // on import. Load the no-op build that RSC bundles get.
      'server-only': fileURLToPath(
        new URL('node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Unit tests never reach a real database or OAuth provider: skip the
    // schema check rather than seeding fake secrets. The app still validates.
    env: { SKIP_ENV_VALIDATION: '1' },
    server: {
      deps: {
        // next-auth imports `next/server` without an extension, which Node's
        // ESM resolver rejects; let Vite resolve it as the bundler does.
        inline: ['next-auth'],
      },
    },
  },
});
