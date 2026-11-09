import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
const hosted = process.argv.includes('--hosted');
const watch = process.argv.includes('--watch');
let origin = process.env.EXPORT_BASE_URL || 'http://127.0.0.1:4173',
  headers = { 'Content-Type': 'application/json' };
if (hosted) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const config = JSON.parse(input);
  const expected = 'https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site';
  if (config.origin !== expected || typeof config.serviceToken !== 'string')
    throw Error('Expected this Site origin and a service-access token via stdin.');
  origin = expected;
  headers['OAI-Sites-Authorization'] = 'Bearer ' + config.serviceToken;
} else {
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
    throw Error('Local export jobs only send their key to a loopback server.');
  const config = parseEnv(await readFile('.dev.vars', 'utf8'));
  if (!config.EXPORT_JOB_SECRET) throw Error('Run npm run setup:local first.');
  headers.Authorization = 'Bearer ' + config.EXPORT_JOB_SECRET;
}
async function run() {
  const r = await fetch(origin + '/api/jobs/daily-export', {
    method: 'POST',
    headers,
    body: '{}',
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw Error(`Daily export failed (HTTP ${r.status}).`);
  const b = await r.json();
  if (!b.export?.date) throw Error('Export readback was missing.');
  console.log(
    `Daily export ${b.export.date}: ${b.export.count} bookings; reservation-system delivery ${b.export.delivery}.`,
  );
  return b.export.date;
}
if (!watch) {
  await run();
} else {
  let last = '';
  let running = false;
  const tick = async () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const today = `${get('year')}-${get('month')}-${get('day')}`;
    if (Number(get('hour')) < 6 || last === today || running) return;
    running = true;
    try {
      await run();
      last = today;
    } catch {
      console.error(
        'Daily export is not ready; the scheduler will retry without duplicating a completed day.',
      );
    } finally {
      running = false;
    }
  };
  await tick();
  setInterval(tick, 30000);
  console.log(
    'Daily-export scheduler running. Due at 06:00 Asia/Kolkata; keep the app server running.',
  );
}
