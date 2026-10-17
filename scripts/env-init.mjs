// Creates `.env` from `.env.example` with a fresh BETTER_AUTH_SECRET.
// An existing `.env` is left untouched. Run it with `pnpm env:init`.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const target = new URL('../.env', import.meta.url);
const example = new URL('../.env.example', import.meta.url);

if (existsSync(target)) {
  console.info('.env already exists; left as it is.');
} else {
  const secret = randomBytes(32).toString('base64url');
  writeFileSync(
    target,
    readFileSync(example, 'utf8').replace(
      'BETTER_AUTH_SECRET=""',
      `BETTER_AUTH_SECRET="${secret}"`,
    ),
  );
  console.info('Created .env with a fresh BETTER_AUTH_SECRET.');
}
