// Creates `.env` from `.env.example` with a fresh BETTER_AUTH_SECRET.
// An existing `.env` is left untouched. Run it with `pnpm env:init`.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const target = new URL('../.env', import.meta.url);
const example = new URL('../.env.example', import.meta.url);
// Whatever the example holds for it (normally `""`).
const secretLine = /^BETTER_AUTH_SECRET=.*$/m;

function init() {
  if (existsSync(target)) {
    console.info('.env already exists; left as it is.');
    return;
  }
  const source = readFileSync(example, 'utf8');
  if (!secretLine.test(source)) {
    throw new Error('.env.example has no BETTER_AUTH_SECRET line to fill.');
  }
  const secret = randomBytes(32).toString('base64url');
  writeFileSync(
    target,
    source.replace(secretLine, `BETTER_AUTH_SECRET="${secret}"`),
    // Never overwrite, and keep the secret readable by its owner only.
    { flag: 'wx', mode: 0o600 },
  );
  console.info('Created .env with a fresh BETTER_AUTH_SECRET.');
}

init();
