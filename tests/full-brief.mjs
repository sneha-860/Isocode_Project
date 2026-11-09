import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { day } from '../lib/domain.mjs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
async function call(path, body, cookie = '', method = body ? 'POST' : 'GET', headers = {}) {
  const r = await fetch(base + '/api/' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text();
  return {
    status: r.status,
    data,
    cookie: r.headers.get('set-cookie')?.split(';')[0] || '',
    type: r.headers.get('content-type'),
  };
}
const login = async (email, password) => {
  const r = await call('auth', { email, password, mode: 'login' });
  assert.equal(r.status, 200);
  return r;
};
await call('plans');
const staff = await login('reservations@mora.test', 'StaffDemo2026!'),
  guest = await login('guest@mora.test', 'GuestDemo2026!'),
  gm = await login('gm@mora.test', 'GMDemo2026!');
assert.equal(gm.data.user.role, 'gm');
assert.equal((await call('offers', null, guest.cookie)).status, 403);
const plans = (await call('plans')).data.plans;
assert(plans.some((p) => p.id === 'full-board'));
const suffix = crypto.randomUUID().slice(0, 6),
  planId = 'test-' + suffix,
  code = 'TEST' + suffix.toUpperCase();
const plan = {
  id: planId,
  name: 'Review full-board plan',
  description: 'Synthetic breakfast, lunch and dinner package.',
  adjustment: 250000,
  active: true,
};
assert.equal((await call('plans', plan, staff.cookie)).status, 200);
assert.equal((await call('plans', plan, guest.cookie)).status, 403);
const offer = {
  code,
  percent: 10,
  validFrom: day(),
  validUntil: day(179),
  minNights: 2,
  maxUses: 1,
  active: true,
};
assert.equal((await call('promos', offer, staff.cookie)).status, 200);
const offset = Number(process.env.TEST_COMMERCE_OFFSET || 100),
  arrival = day(offset),
  departure = day(offset + 2);
for (const date of [arrival, day(offset + 1)])
  assert.equal(
    (
      await call(
        'rates',
        { roomId: 'estate', date, rate: 750000, allotment: 10, blackout: false },
        staff.cookie,
        'PATCH',
      )
    ).status,
    200,
  );
const search = `availability?arrival=${arrival}&departure=${departure}&guests=2&planId=${planId}`;
let room = (await call(search + '&promoCode=' + code)).data.rooms.find((r) => r.id === 'estate');
assert.equal(room.subtotal, 2000000);
assert.equal(room.discount, 200000);
assert.equal(room.tax, 324000);
assert.equal(room.total, 2124000);
assert.equal(
  (
    await call(
      `availability?arrival=${arrival}&departure=${day(offset + 1)}&guests=2&promoCode=${code}`,
    )
  ).status,
  400,
);
const request = {
  roomId: 'estate',
  arrival,
  departure,
  guests: 2,
  planId,
  promoCode: code,
  payment: 'success',
  total: room.total,
};
const race = await Promise.all(
  [1, 2].map(() => call('bookings', { ...request, requestKey: crypto.randomUUID() }, guest.cookie)),
);
assert.equal(race.filter((r) => r.status === 201).length, 1);
assert.equal(race.filter((r) => r.status === 409).length, 1);
const booked = race.find((r) => r.status === 201).data.booking;
assert.equal(booked.plan_name, plan.name);
assert.equal(booked.promo_code, code);
assert.equal(booked.discount, 200000);
const history = (await call('bookings', null, guest.cookie)).data.bookings;
assert(history.some((b) => b.id === booked.id && b.total === 2124000));
const withoutPromo = (await call(search)).data.rooms.find((r) => r.id === 'estate');
await call('plans', { ...plan, adjustment: 300000 }, staff.cookie);
assert.equal(
  (
    await call(
      'bookings',
      { ...request, promoCode: '', total: withoutPromo.total, requestKey: crypto.randomUUID() },
      guest.cookie,
    )
  ).status,
  409,
);
await call('promos', { ...offer, active: false }, staff.cookie);
assert.equal((await call(search + '&promoCode=' + code)).status, 400);
await call('plans', { ...plan, active: false }, staff.cookie);
assert(!(await call('plans')).data.plans.some((p) => p.id === planId));
const enq = await call(
  'enquiries',
  {
    name: 'Escalation Demo',
    email: `gm-${suffix}@example.test`,
    message: 'The room was dirty and the service was rude. Please alert the manager.',
  },
  staff.cookie,
);
assert.equal(enq.status, 201);
assert.equal((await call('inbox/acknowledge', { id: enq.data.id }, staff.cookie)).status, 403);
assert.equal((await call('inbox/acknowledge', { id: enq.data.id }, gm.cookie)).status, 200);
let item = (await call('inbox', null, gm.cookie)).data.enquiries.find((e) => e.id === enq.data.id);
assert.equal(item.alert, 1);
assert(item.gm_acknowledged_at);
assert.equal(item.gm_acknowledged_by, gm.data.user.id);
assert.equal(
  (await call('inbox/route', { id: item.id, category: 'Wedding' }, staff.cookie)).status,
  200,
);
item = (await call('inbox', null, staff.cookie)).data.enquiries.find((e) => e.id === item.id);
assert.equal(item.category, 'Wedding');
assert.equal(item.owner, 'Events team');
assert.equal(item.alert, 1);
await call('inbox/route', { id: item.id, category: 'Unsorted' }, staff.cookie);
item = (await call('inbox', null, gm.cookie)).data.enquiries.find((e) => e.id === item.id);
assert.equal(item.gm_acknowledged_at, null);
assert.equal((await call('exports', { date: day(-1) }, guest.cookie)).status, 403);
assert.equal((await call('exports', { date: day() }, staff.cookie)).status, 400);
const snapshot = (await call('exports', { date: day(-1) }, staff.cookie)).data.export;
assert.equal(snapshot.date, day(-1));
assert.equal(snapshot.delivery, 'simulated');
const again = (await call('exports', { date: day(-1) }, staff.cookie)).data.export;
assert.equal(again.created, snapshot.created);
const file = await call('exports/file?date=' + day(-1), null, staff.cookie);
assert.equal(file.status, 200);
assert(file.type.includes('text/csv'));
assert(file.data.includes('Rate plan'));
assert.equal((await call('exports/file?date=' + day(-1), null, guest.cookie)).status, 403);
assert.equal((await call('jobs/daily-export', {})).status, 403);
const vars = parseEnv(await readFile('.dev.vars', 'utf8'));
const job = await call('jobs/daily-export', {}, '', 'POST', {
  Authorization: 'Bearer ' + vars.EXPORT_JOB_SECRET,
});
assert.equal(job.status, 200);
assert.equal(job.data.export.date, day(-1));
console.log(
  'PASS: plan/promo admin, discounted GST totals, atomic final redemption, immutable booking terms, stale price rejection, GM access/acknowledgement, one-click routing, daily CSV persistence/idempotency and protected unattended export writer.',
);
