#!/usr/bin/env node
// create-vichudo-app: start a new app from the vichudo/vichudo-app template.
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

const TEMPLATE = 'https://github.com/vichudo/vichudo-app.git';
// Template-repo files that do not belong in an app. An app chooses its own
// license.
const TEMPLATE_ONLY = ['.git', 'cli', 'LICENSE'];
const UI_DIR = 'src/components/ui';
const MIN_NODE_MAJOR = 24;
// The template's `pnpm db:dev` ports (server, database, shadow database).
const TEMPLATE_DB_PORTS = [51213, 51214, 51215];

const HELP = `Usage: pnpm create vichudo-app [directory] [options]

Options:
  --ref <branch|tag>   Template version to use (default: the default branch)
  --template <url>     Git URL or path of the template (default: ${TEMPLATE})
  --components <set>   shadcn/ui components to fetch: \`all\` (default) or
                       \`essentials\`, the ones the template's pages use
  --no-install         Skip \`pnpm install\`
  --no-git             Skip \`git init\` and the first commit
  -y, --yes            Accept defaults without prompting
  -h, --help           Show this help
  -v, --version        Show the version`;

class CliError extends Error {}

/** @typedef {'all' | 'essentials'} ComponentSet */

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

/**
 * Asks one question on the terminal and returns the trimmed answer.
 *
 * @param {string} question
 */
async function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function promptDirectory() {
  const answer = await ask(
    `${styleText('bold', 'Project directory')} ${styleText('dim', '(my-app)')}: `,
  );
  return answer || 'my-app';
}

/** @returns {Promise<ComponentSet>} */
async function promptComponents() {
  console.info(`
${styleText('bold', 'shadcn/ui components')}, fetched fresh from the registry:
  1. All of them ${styleText('dim', '(recommended)')}
  2. Just the essentials the template's pages use ${styleText('dim', '(add more any time)')}`);
  const answer = await ask('Choose 1 or 2 (1): ');
  return answer === '2' ? 'essentials' : 'all';
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
 * Commits everything as the app's first commit; a missing identity is fine.
 *
 * @param {string} root
 */
function commitAll(root) {
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
 * How to run pnpm here: directly, or through Corepack when pnpm itself is
 * not installed.
 *
 * @returns {string[] | undefined}
 */
function findPnpm() {
  if (hasCommand('pnpm')) return ['pnpm'];
  if (hasCommand('corepack')) return ['corepack', 'pnpm'];
  return undefined;
}

/**
 * Fetches shadcn/ui components fresh from the registry, so an app never
 * starts with stale copies: all of them, or just the essentials (the ones
 * the template ships, refreshed). Then formats them in the house style.
 * Offline, the template's bundled essentials stay.
 *
 * @param {string} root
 * @param {string[]} pnpm
 * @param {ComponentSet} set
 */
function addComponents(root, pnpm, set) {
  const [command = 'pnpm', ...prefix] = pnpm;
  const essentials = readdirSync(path.join(root, UI_DIR)).map((file) =>
    path.basename(file, '.tsx'),
  );
  console.info(
    `\nFetching ${set === 'all' ? 'all shadcn/ui components' : `${essentials.length} shadcn/ui components`} from the registry…`,
  );
  try {
    run(
      command,
      [
        ...prefix,
        'exec',
        'shadcn',
        'add',
        ...(set === 'all' ? ['--all'] : essentials),
        '--overwrite',
        '--yes',
      ],
      { cwd: root, quiet: true },
    );
    run(command, [...prefix, 'exec', 'oxfmt'], { cwd: root, quiet: true });
  } catch {
    console.warn(
      styleText(
        'yellow',
        'Could not reach the shadcn/ui registry: kept the bundled essentials. Add more later with `pnpm exec shadcn add <name>`.',
      ),
    );
    return;
  }
  const count = readdirSync(path.join(root, UI_DIR)).length;
  console.info(`Added ${count} components to ${UI_DIR}.`);
}

/**
 * The component set from `--components`, or asked for when interactive.
 *
 * @param {string | undefined} flag
 * @param {boolean} interactive
 * @returns {Promise<ComponentSet>}
 */
async function chooseComponents(flag, interactive) {
  if (flag === 'all' || flag === 'essentials') return flag;
  if (flag !== undefined) {
    throw new CliError('--components must be `all` or `essentials`.');
  }
  return interactive ? promptComponents() : 'all';
}

/**
 * Installs dependencies and fetches the components. Returns whether it
 * installed: without pnpm, the app is left for the user to install.
 *
 * @param {string} root
 * @param {ComponentSet} components
 */
function installApp(root, components) {
  const pnpm = findPnpm();
  if (!pnpm) {
    console.warn(
      styleText(
        'yellow',
        'pnpm was not found. Run `corepack enable`, then `pnpm install`.',
      ),
    );
    return false;
  }
  const [command = 'pnpm', ...prefix] = pnpm;
  run(command, [...prefix, 'install'], { cwd: root });
  addComponents(root, pnpm, components);
  return true;
}

/**
 * @param {string} root
 * @param {string} name
 * @param {boolean} installed
 * @param {ComponentSet} components
 */
function printNextSteps(root, name, installed, components) {
  const relative = path.relative(process.cwd(), root) || '.';
  const cd = /\s/.test(relative) ? `"${relative}"` : relative;
  const firstSteps = [
    relative === '.' ? '' : `cd ${cd}`,
    installed ? '' : 'pnpm install',
    // Components are fetched after installing; without it, only the
    // template's bundled essentials are there.
    !installed && components === 'all'
      ? 'pnpm exec shadcn add --all --yes && pnpm format'
      : '',
  ].filter(Boolean);

  console.info(`
${styleText('green', `Created ${name}.`)} Start it:

${[...firstSteps, `pnpm db:dev                 ${comment('local Postgres, leave it running')}`].map((line) => `  ${line}`).join('\n')}

Then, in a second terminal:

  pnpm db:push && pnpm dev    ${comment('create the tables, start the app')}

Open http://localhost:3000 and create an account. Next steps are in README.md.
`);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      ref: { type: 'string' },
      template: { type: 'string', default: TEMPLATE },
      components: { type: 'string' },
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
  const components = await chooseComponents(values.components, interactive);

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
  // Before installing: husky's `prepare` script installs the git hooks.
  if (values.git) run('git', ['init', '--quiet'], { cwd: root });

  const installed = values.install && installApp(root, components);
  if (values.git) commitAll(root);

  printNextSteps(root, name, installed, components);
}

try {
  await main();
} catch (error) {
  if (!(error instanceof CliError)) throw error;
  console.error(styleText('red', `\n${error.message}`));
  process.exitCode = 1;
}
