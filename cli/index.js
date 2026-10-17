#!/usr/bin/env node
// create-vichudo-app: start a new app from the vichudo/t3-latest template.
// No dependencies: it clones the template with git, personalises it, and
// installs with pnpm.

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parseArgs, styleText } from 'node:util';

const TEMPLATE = 'https://github.com/vichudo/t3-latest.git';
// Template-repo files that do not belong in an app.
const TEMPLATE_ONLY = ['.git', 'cli'];
const MIN_NODE_MAJOR = 24;
// The template's `pnpm db:dev` ports (server, database, shadow database).
const TEMPLATE_DB_PORTS = [51213, 51214, 51215];

const HELP = `Usage: pnpm create vichudo-app [directory] [options]

Options:
  --ref <branch|tag>   Template version to use (default: the default branch)
  --template <url>     Git URL or path of the template (default: ${TEMPLATE})
  --no-install         Skip \`pnpm install\`
  --no-git             Skip \`git init\` and the first commit
  -y, --yes            Accept defaults without prompting
  -h, --help           Show this help
  -v, --version        Show the version`;

class CliError extends Error {}

/**
 * A dimmed shell comment for printed commands.
 *
 * @param {string} text
 */
const comment = (text) => styleText('dim', `# ${text}`);

/**
 * Runs a command, inheriting stdio unless `quiet`. Throws on failure.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, quiet?: boolean }} [options]
 */
function run(command, args, { cwd, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: quiet ? 'pipe' : 'inherit',
    // pnpm and git are `.cmd` shims on Windows.
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new CliError(`\`${[command, ...args].join(' ')}\` failed.`);
  }
}

/**
 * Whether `command --version` runs, i.e. the tool is installed.
 *
 * @param {string} command
 */
function hasCommand(command) {
  return (
    spawnSync(command, ['--version'], {
      stdio: 'ignore',
      shell: process.platform === 'win32',
    }).status === 0
  );
}

/**
 * An npm-valid package name derived from a directory name.
 *
 * @param {string} directoryName
 */
function toPackageName(directoryName) {
  return directoryName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._~-]+/g, '-')
    .replaceAll(/^[._-]+|[-]+$/g, '');
}

/**
 * Rewrites a file in place with `transform`.
 *
 * @param {string} file
 * @param {(source: string) => string} transform
 */
function editFile(file, transform) {
  writeFileSync(file, transform(readFileSync(file, 'utf8')));
}

async function promptDirectory() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(
      `${styleText('bold', 'Project directory')} ${styleText('dim', '(my-app)')}: `,
    );
    return answer.trim() || 'my-app';
  } finally {
    rl.close();
  }
}

/**
 * Whether nothing listens on `port` locally.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Three consecutive free ports for this app's `pnpm db:dev`, so its local
 * database never collides with another app's.
 */
async function pickDatabasePorts() {
  const candidates = Array.from({ length: 10 }, () => {
    const base = 52_000 + Math.floor(Math.random() * 2000) * 3;
    return [base, base + 1, base + 2];
  });
  const free = await Promise.all(
    candidates.map(async (ports) =>
      (await Promise.all(ports.map(isPortFree))).every(Boolean),
    ),
  );
  const ports = candidates[free.indexOf(true)];
  if (!ports) throw new CliError('Found no free ports for the local database.');
  return ports;
}

/**
 * Points the template at this project: package name and its own local
 * database (`pnpm db:dev` server name and ports, mirrored in `.env.example`).
 *
 * @param {string} root
 * @param {string} name
 * @param {number[]} ports server, database and shadow database ports
 */
function personalise(root, name, ports) {
  editFile(path.join(root, 'package.json'), (source) => {
    const pkg = /** @type {{ scripts: Record<string, string> }} */ (
      JSON.parse(source)
    );
    const [server, database, shadow] = ports;
    const scripts = {
      ...pkg.scripts,
      'db:dev': `prisma dev --name ${name} --port ${server} --db-port ${database} --shadow-db-port ${shadow}`,
    };
    return `${JSON.stringify({ ...pkg, name, scripts }, null, 2)}\n`;
  });

  editFile(path.join(root, '.env.example'), (source) =>
    TEMPLATE_DB_PORTS.reduce(
      (text, port, index) =>
        text.replaceAll(`localhost:${port}/`, `localhost:${ports[index]}/`),
      source,
    ),
  );

  // The template's README has sections about the template itself.
  editFile(path.join(root, 'README.md'), (source) =>
    source
      .replaceAll(
        /<!-- template-only -->[\s\S]*?<!-- \/template-only -->\n*/g,
        '',
      )
      .replace(/^# .*$/m, `# ${name}`),
  );
}

/**
 * Creates the repository and its first commit; a missing identity is fine.
 *
 * @param {string} root
 */
function initGit(root) {
  run('git', ['init', '--quiet'], { cwd: root });
  run('git', ['add', '--all'], { cwd: root });
  try {
    run(
      'git',
      [
        'commit',
        '--quiet',
        '--no-verify',
        '-m',
        'Initial commit from create-vichudo-app',
      ],
      { cwd: root, quiet: true },
    );
  } catch {
    console.warn(
      styleText(
        'yellow',
        'Created the repository, but could not commit (set git user.name and user.email).',
      ),
    );
  }
}

/**
 * Installs with pnpm, through Corepack when pnpm itself is not installed.
 *
 * @param {string} root
 */
function install(root) {
  if (hasCommand('pnpm')) {
    run('pnpm', ['install'], { cwd: root });
    return true;
  }
  if (hasCommand('corepack')) {
    run('corepack', ['pnpm', 'install'], { cwd: root });
    return true;
  }
  console.warn(
    styleText(
      'yellow',
      'pnpm was not found. Run `corepack enable`, then `pnpm install`.',
    ),
  );
  return false;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      ref: { type: 'string' },
      template: { type: 'string', default: TEMPLATE },
      install: { type: 'boolean', default: true },
      git: { type: 'boolean', default: true },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });

  if (values.help) {
    console.info(HELP);
    return;
  }
  if (values.version) {
    const pkg = /** @type {{ version: string }} */ (
      JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8'))
    );
    console.info(pkg.version);
    return;
  }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < MIN_NODE_MAJOR) {
    throw new CliError(
      `Node.js ${MIN_NODE_MAJOR} or newer is required; this is ${process.versions.node}.`,
    );
  }
  if (!hasCommand('git')) {
    throw new CliError('git is required to download the template.');
  }

  const interactive = stdin.isTTY && !values.yes;
  const directory =
    positionals[0] ?? (interactive ? await promptDirectory() : 'my-app');
  const root = path.resolve(directory);
  const name = toPackageName(path.basename(root));
  if (!name) {
    throw new CliError(`"${directory}" does not give a valid package name.`);
  }
  if (existsSync(root) && readdirSync(root).length > 0) {
    throw new CliError(`${directory} already exists and is not empty.`);
  }

  console.info(`\nCreating ${styleText('bold', name)} in ${root}\n`);

  // Shallow-clone into the (empty or missing) directory, then drop the
  // template's history and repository-only files.
  const cloneArgs = ['clone', '--depth', '1', '--quiet'];
  if (values.ref) cloneArgs.push('--branch', values.ref);
  run('git', [...cloneArgs, values.template, root]);
  for (const entry of TEMPLATE_ONLY) {
    rmSync(path.join(root, entry), { recursive: true, force: true });
  }

  personalise(root, name, await pickDatabasePorts());
  // The app's own script writes `.env`, so clones of the app get the same.
  run('node', ['scripts/env-init.mjs'], { cwd: root, quiet: true });
  if (values.git) initGit(root);
  const installed = values.install && install(root);

  const relative = path.relative(process.cwd(), root) || '.';
  const cd = /\s/.test(relative) ? `"${relative}"` : relative;
  const firstSteps = [
    relative === '.' ? '' : `cd ${cd}`,
    installed ? '' : 'pnpm install',
  ].filter(Boolean);

  console.info(`
${styleText('green', `Created ${name}.`)} Start it:

${[...firstSteps, `pnpm db:dev                 ${comment('local Postgres, leave it running')}`].map((line) => `  ${line}`).join('\n')}

Then, in a second terminal:

  pnpm db:push && pnpm dev    ${comment('create the tables, start the app')}

Open http://localhost:3000 and create an account. Next steps are in README.md.
`);
}

try {
  await main();
} catch (error) {
  if (!(error instanceof CliError)) throw error;
  console.error(styleText('red', `\n${error.message}`));
  process.exitCode = 1;
}
