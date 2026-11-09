import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
let raw = '';
try {
  raw = await readFile('.dev.vars', 'utf8');
} catch {
  await writeFile(
    '.dev.vars',
    '# Local-only secrets. Never commit this file.\nGEMINI_API_KEY=\nGEMINI_MODEL=\n',
  );
}
if (!parseEnv(raw).EXPORT_JOB_SECRET) {
  await appendFile(
    '.dev.vars',
    `${raw.endsWith('\n') ? '' : '\n'}EXPORT_JOB_SECRET=${randomBytes(32).toString('hex')}\n`,
  );
}
console.log(
  'Local daily-export secret is configured in ignored .dev.vars. No secret values are printed.',
);
