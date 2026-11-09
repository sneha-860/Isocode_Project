import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { quoteStay, validatePromo, propertyDate, exportWindow } from '../lib/domain.mjs';
import { dailyExport, bookingCsv } from '../lib/exports.mjs';
const dates = ['2027-01-01', '2027-01-02'];
const plan = { id: 'standard', name: 'Breakfast included', adjustment: 0, active: 1 };
const promo = {
  code: 'MORA10',
  percent: 10,
  valid_from: '2027-01-01',
  valid_until: '2027-01-31',
  min_nights: 2,
  max_uses: 1,
  active: 1,
};
test('rate plans and promos affect the nightly taxable tariff with integer paise rounding', () => {
  const nights = dates.map((date) => ({ date, rate: 750000 }));
  const base = quoteStay(nights, plan, promo);
  assert.equal(base.subtotal, 1500000);
  assert.equal(base.discount, 150000);
  assert.equal(base.tax, 67500);
  assert.equal(base.total, 1417500);
  assert(base.nights.every((n) => n.gst_percent === 5));
  const board = quoteStay(nights, { ...plan, adjustment: 250000 }, promo);
  assert.equal(board.total, 2124000);
  assert.equal(board.tax, 324000);
  assert(board.nights.every((n) => n.gst_percent === 18));
  assert.equal(quoteStay([{ rate: 100001 }], plan, { percent: 13 }).nights[0].discount, 13000);
});
test('promo eligibility covers all occupied nights and rejects disabled, short and exhausted offers', () => {
  assert.equal(validatePromo(promo, dates, 0).code, 'MORA10');
  for (const [p, d, u] of [
    [null, dates, 0],
    [{ ...promo, active: 0 }, dates, 0],
    [{ ...promo, valid_until: dates[0] }, dates, 0],
    [promo, [dates[0]], 0],
    [promo, dates, 1],
  ])
    assert.throws(() => validatePromo(p, d, u));
});
test('India business-day boundaries are consistent across booking defaults and exports', () => {
  assert.equal(propertyDate(new Date('2026-11-08T19:00:00Z')), '2026-11-09');
  const w = exportWindow('2026-11-08');
  assert.equal(new Date(w.start).toISOString(), '2026-11-07T18:30:00.000Z');
  assert.equal(w.end - w.start, 86400000);
  assert.throws(() => exportWindow('2026-02-30'));
});
function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const file of [
    '0000_confused_boomer',
    '0001_inventory_guards',
    '0002_supreme_lionheart',
    '0003_petite_ironclad',
    '0004_commerce_guards',
  ])
    db.exec(readFileSync(new URL('../drizzle/' + file + '.sql', import.meta.url), 'utf8'));
  db.exec(
    "INSERT INTO users VALUES('u','demo@example.test','=FORMULA','hash','salt','guest');INSERT INTO rooms VALUES('r','Room',3,40,750000,4);INSERT INTO rate_plans VALUES('standard','Breakfast included','Breakfast',0,1),('full-board','Full board','All meals',250000,1);INSERT INTO promos VALUES('MORA10',10,'2027-01-01','2027-01-31',2,1,1);INSERT INTO inventory VALUES('r','2027-01-01',750000,4,0),('r','2027-01-02',750000,4,0)",
  );
  return db;
}
function book(db, id, ratePlan = plan, offer = null, created = 0) {
  const quote = quoteStay(
    dates.map((date) => ({ date, rate: 750000 })),
    ratePlan,
    offer,
  );
  db.exec('BEGIN');
  try {
    db.prepare(
      'INSERT INTO bookings(id,user_id,room_id,arrival,departure,guests,total,request_key,created,plan_id,plan_name,plan_adjustment,promo_code,discount_percent,subtotal,discount,tax) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      id,
      'u',
      'r',
      dates[0],
      '2027-01-03',
      2,
      quote.total,
      id,
      created,
      ratePlan.id,
      ratePlan.name,
      ratePlan.adjustment,
      offer?.code || null,
      offer?.percent || 0,
      quote.subtotal,
      quote.discount,
      quote.tax,
    );
    for (const n of quote.nights)
      db.prepare(
        'INSERT INTO nights(booking_id,room_id,date,rate,net_rate,tax) VALUES (?,?,?,?,?,?)',
      ).run(id, 'r', n.date, n.rate, n.net_rate, n.tax);
    db.exec('COMMIT');
    return quote;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
test('the final promo redemption is atomic even with physical stock remaining', () => {
  const db = setup();
  book(db, 'first', plan, promo);
  assert.throws(() => book(db, 'second', plan, promo));
  assert.equal(db.prepare('SELECT count(*) n FROM bookings').get().n, 1);
  assert.equal(db.prepare('SELECT count(*) n FROM nights').get().n, 2);
  assert.throws(() => db.exec('UPDATE promos SET max_uses=0'));
  db.close();
});
test('stale plan and promo terms reject the entire booking transaction', () => {
  const db = setup();
  db.exec("UPDATE rate_plans SET adjustment=10000 WHERE id='standard'");
  assert.throws(() => book(db, 'stale-plan'));
  db.exec("UPDATE rate_plans SET adjustment=0 WHERE id='standard';UPDATE promos SET percent=20");
  assert.throws(() => book(db, 'stale-promo', plan, promo));
  assert.equal(db.prepare('SELECT count(*) n FROM bookings').get().n, 0);
  db.close();
});
test('confirmed prices and plan names remain snapshots after admin edits', () => {
  const db = setup();
  const quote = book(db, 'snapshot', plan, promo);
  db.exec("UPDATE rate_plans SET name='Renamed',adjustment=200000;UPDATE promos SET percent=25");
  const saved = db.prepare("SELECT * FROM bookings WHERE id='snapshot'").get();
  assert.equal(saved.plan_name, 'Breakfast included');
  assert.equal(saved.total, quote.total);
  assert.equal(saved.discount_percent, 10);
  db.close();
});
function adapter(db) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) {
          values = args;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...values) || null;
        },
        async all() {
          return { results: db.prepare(sql).all(...values) };
        },
        async run() {
          const r = db.prepare(sql).run(...values);
          return { meta: { changes: Number(r.changes) } };
        },
      };
    },
  };
}
test('daily export uses India-day bounds, persists CSV, and is idempotent on retry', async () => {
  const db = setup(),
    w = exportWindow('2026-11-08');
  book(db, 'before', plan, null, w.start - 1);
  book(db, 'inside', plan, null, w.start);
  book(db, 'after', plan, null, w.end);
  const result = await dailyExport(adapter(db), '2026-11-08');
  assert.equal(result.count, 1);
  assert.equal(result.delivery, 'simulated');
  const csv = db.prepare("SELECT csv FROM daily_exports WHERE date='2026-11-08'").get().csv;
  assert(csv.includes('inside'));
  assert(!csv.includes('before'));
  assert(!csv.includes('after'));
  assert(csv.includes("'=FORMULA"));
  await dailyExport(adapter(db), '2026-11-08');
  assert.equal(db.prepare('SELECT count(*) n FROM daily_exports').get().n, 1);
  db.close();
});
test('zero-booking daily export is still downloadable and CSV is safely quoted', async () => {
  const db = setup();
  const result = await dailyExport(adapter(db), '2026-11-07');
  assert.equal(result.count, 0);
  assert(bookingCsv([]).startsWith('"Reference"'));
  assert(
    bookingCsv([{ id: 'x', guest_name: 'Test, "Demo"', total: 100, discount: 0 }]).includes(
      '"Test, ""Demo"""',
    ),
  );
  db.close();
});
