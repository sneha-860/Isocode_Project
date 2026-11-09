import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const localSecrets = path.join(root, '.dev.vars');
// The generated Wrangler config lives in dist/server. Resolve local secrets from
// the repository root explicitly; never copy them into build/deployment output.
const args = [
  '--import',
  './scripts/sites-env.mjs',
  './node_modules/wrangler/bin/wrangler.js',
  'dev',
  '--config',
  'dist/server/wrangler.json',
  '--local',
  '--persist-to',
  '.wrangler/state',
  '--ip',
  '127.0.0.1',
  '--inspector-port',
  '0',
];
if (existsSync(localSecrets)) args.push('--env-file', localSecrets);
args.push(...process.argv.slice(2));
const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
child.on('error', () => {
  console.error('Could not start the local preview.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
