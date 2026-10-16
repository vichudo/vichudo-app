import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Optional while developing, required for a production build.
 *
 * @template {z.ZodType} T
 * @param {T} schema
 */
const requiredInProduction = (schema) =>
  process.env.NODE_ENV === 'production' ? schema : schema.optional();

export const env = createEnv({
  /**
   * Server-only variables. Read them through `env`, never `process.env`, so a
   * missing or malformed value fails the build instead of a request.
   */
  server: {
    AUTH_SECRET: requiredInProduction(z.string()),
    AUTH_DISCORD_ID: requiredInProduction(z.string()),
    AUTH_DISCORD_SECRET: requiredInProduction(z.string()),
    DATABASE_URL: z
      .url()
      .refine(
        (url) => /^postgres(ql)?:\/\//.test(url),
        'DATABASE_URL must be a PostgreSQL connection URL.',
      ),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },

  /**
   * Browser-safe variables. Each one must be prefixed with `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * `process.env` cannot be destructured in every Next.js runtime, and listing
   * each key lets the bundler inline client values.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },

  /**
   * Set `SKIP_ENV_VALIDATION` to build without real values (Docker, CI).
   */
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),

  /**
   * Treat `FOO=''` as unset, so an empty value fails a required variable.
   */
  emptyStringAsUndefined: true,
});
