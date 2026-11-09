import { day, exportWindow } from './domain.mjs';
export function bookingCsv(bookings) {
  const cell = (v) =>
    '"' +
    String(v ?? '')
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return [
    [
      'Reference',
      'Guest',
      'Email',
      'Room',
      'Rate plan',
      'Promo',
      'Arrival',
      'Departure',
      'Guests',
      'Subtotal INR',
      'Discount INR',
      'GST INR',
      'Total INR',
    ],
    ...bookings.map((b) => [
      b.id,
      b.guest_name,
      b.email,
      b.room_name,
      b.plan_name,
      b.promo_code,
      b.arrival,
      b.departure,
      b.guests,
      b.subtotal == null ? '' : (b.subtotal / 100).toFixed(2),
      (b.discount / 100).toFixed(2),
      b.tax == null ? '' : (b.tax / 100).toFixed(2),
      (b.total / 100).toFixed(2),
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}
export async function dailyExport(db, date = day(-1)) {
  const { start, end } = exportWindow(date);
  const existing = await db
    .prepare('SELECT date,count,created,delivery FROM daily_exports WHERE date=?')
    .bind(date)
    .first();
  if (existing) return { ...existing, reused: true };
  const { results } = await db
    .prepare(
      'SELECT b.*,r.name AS room_name,u.name AS guest_name,u.email FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=b.user_id WHERE b.created>=? AND b.created<? ORDER BY b.created,b.id',
    )
    .bind(start, end)
    .all();
  const csv = bookingCsv(results);
  await db
    .prepare(
      "INSERT OR IGNORE INTO daily_exports(date,csv,count,created,delivery) VALUES (?,?,?,?,'simulated')",
    )
    .bind(date, csv, results.length, Date.now())
    .run();
  return db
    .prepare('SELECT date,count,created,delivery FROM daily_exports WHERE date=?')
    .bind(date)
    .first();
}
