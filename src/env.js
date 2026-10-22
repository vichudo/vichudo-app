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
    // Signs sessions and tokens. Generate one with `pnpm auth:secret`.
    BETTER_AUTH_SECRET: requiredInProduction(z.string().min(32)),
    // The app's public URL. Inferred from the request when unset.
    BETTER_AUTH_URL: z.url().optional(),
    // Google sign-in turns on once both are set.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
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
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },

  /**
   * Cross-variable rules. Google sign-in needs both of its keys: either one
   * alone would quietly leave it off.
   */
  createFinalSchema: (shape) =>
    z
      .object(shape)
      .refine(
        (vars) =>
          (vars.GOOGLE_CLIENT_ID === undefined) ===
          (vars.GOOGLE_CLIENT_SECRET === undefined),
        {
          message:
            'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.',
          path: ['GOOGLE_CLIENT_SECRET'],
        },
      ),

  /**
   * Set `SKIP_ENV_VALIDATION=1` to build without real values (Docker, CI).
   * `0` or `false` keep validation on.
   */
  skipValidation: ['1', 'true'].includes(process.env.SKIP_ENV_VALIDATION ?? ''),

  /**
   * Treat `FOO=''` as unset, so an empty value fails a required variable.
   */
  emptyStringAsUndefined: true,
});
