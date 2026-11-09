import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
await import('./configure-local.mjs');
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
let scheduler;
let stopping = false;
const cli = process.argv.slice(2),
  portAt = cli.indexOf('--port');
const port = portAt >= 0 ? Number(cli[portAt + 1]) : 8787;
async function startScheduler() {
  for (let n = 0; n < 60 && !stopping; n++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/session`);
      if (response.ok) {
        scheduler = spawn(process.execPath, ['scripts/run-daily-export.mjs', '--watch'], {
          cwd: root,
          stdio: 'inherit',
          windowsHide: true,
          env: { ...process.env, EXPORT_BASE_URL: `http://127.0.0.1:${port}` },
        });
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
}
void startScheduler();
child.on('error', () => {
  console.error('Could not start the local preview.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  stopping = true;
  scheduler?.kill();
  process.exitCode = code ?? 0;
});
process.on('SIGINT', () => {
  stopping = true;
  scheduler?.kill();
  child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  stopping = true;
  scheduler?.kill();
  child.kill('SIGTERM');
});
