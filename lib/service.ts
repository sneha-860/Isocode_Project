import { env } from 'cloudflare:workers';
import {
  categories,
  owners,
  classify,
  extract,
  draftReply,
  day,
  stayDates,
  price,
  quoteStay,
  validatePromo,
  exportWindow,
} from './domain.mjs';
import { dailyExport, bookingCsv } from './exports.mjs';
import { analyzeEnquiry, fallbackAnalysis, hasGeminiKey, DEFAULT_GEMINI_MODEL } from './gemini.mjs';

const db = () => {
  if (!env.DB) throw Error('Database unavailable. Please try again shortly.');
  return env.DB;
};
const q = (sql: string, ...args: any[]) =>
  db()
    .prepare(sql)
    .bind(...args);
const rows = async (sql: string, ...args: any[]) => (await q(sql, ...args).all()).results as any[];
const first = async (sql: string, ...args: any[]) => q(sql, ...args).first<any>();
const hex = (a: ArrayBuffer) =>
  Array.from(new Uint8Array(a), (n) => n.toString(16).padStart(2, '0')).join('');
async function hash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return hex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
      key,
      256,
    ),
  );
}
const digest = async (s: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const operator = (u: any) => u && ['staff', 'gm'].includes(u.role);
export const roomSeed = [
  { id: 'estate', name: 'Estate Room', capacity: 3, keys: 40, base: 750000, allotment: 8 },
  { id: 'canopy', name: 'Canopy Suite', capacity: 3, keys: 24, base: 950000, allotment: 5 },
  { id: 'villa', name: 'Private Pool Villa', capacity: 4, keys: 12, base: 1650000, allotment: 3 },
];
async function seed() {
  // Seed data is separate from schema migrations. Idempotent inserts preserve edits.
  if (await first('SELECT id FROM rooms LIMIT 1')) return;
  const statements: any[] = [];
  for (const r of roomSeed)
    statements.push(
      q(
        'INSERT OR IGNORE INTO rooms(id,name,capacity,keys,base,allotment) VALUES (?,?,?,?,?,?)',
        r.id,
        r.name,
        r.capacity,
        r.keys,
        r.base,
        r.allotment,
      ),
    );
  for (const [id, email, name, role, password] of [
    ['demo-guest', 'guest@mora.test', 'Aarav Demo', 'guest', 'GuestDemo2026!'],
    ['demo-staff', 'reservations@mora.test', 'Nisha Demo', 'staff', 'StaffDemo2026!'],
  ]) {
    const salt = crypto.randomUUID();
    statements.push(
      q(
        'INSERT OR IGNORE INTO users(id,email,name,role,password,salt) VALUES (?,?,?,?,?,?)',
        id,
        email,
        name,
        role,
        await hash(password, salt),
        salt,
      ),
    );
  }
  const examples = [
    [
      'ENQ-4410',
      'Leela Demo',
      'Venue for my sister’s wedding in Feb 2027, about 250 guests, 2 nights',
      'Email',
    ],
    ['ENQ-4411', 'Kabir Demo', 'Is a villa free 14-16 Nov for 2 adults and a child?', 'WhatsApp'],
    [
      'ENQ-4412',
      'Maya Demo',
      'Team of 45 wants a January offsite with a conference hall',
      'Web form',
    ],
    [
      'ENQ-4413',
      'Rohan Demo',
      'I am disappointed. Our room was dirty and the service was rude.',
      'Email',
    ],
    [
      'ENQ-4414',
      'Ananya Demo',
      'Hello, could we discuss something special for next year?',
      'WhatsApp',
    ],
  ];
  for (const [id, name, message, channel] of examples) {
    const c = classify(message),
      e = extract(message);
    statements.push(
      q(
        'INSERT OR IGNORE INTO enquiries(id,name,email,message,channel,category,confidence,owner,extracted,draft,status,alert,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id,
        name,
        'demo@example.test',
        message,
        channel,
        c.category,
        c.confidence,
        c.owner,
        JSON.stringify(e),
        draftReply(name, c.category, e),
        'new',
        c.alert,
        Date.now() - 3600000,
      ),
    );
  }
  await db().batch(statements);
}
async function seedAdditions() {
  const hasPlan = await first("SELECT id FROM rate_plans WHERE id='standard'");
  if (!hasPlan)
    await db().batch([
      q(
        'INSERT OR IGNORE INTO rate_plans(id,name,description,adjustment,active) VALUES (?,?,?,?,1)',
        'standard',
        'Breakfast included',
        'Room and breakfast for all booked guests.',
        0,
      ),
      q(
        'INSERT OR IGNORE INTO rate_plans(id,name,description,adjustment,active) VALUES (?,?,?,?,1)',
        'full-board',
        'Full board',
        'Breakfast, lunch and dinner for all booked guests. Demo package.',
        250000,
      ),
      q(
        'INSERT OR IGNORE INTO promos(code,percent,valid_from,valid_until,min_nights,max_uses,active) VALUES (?,?,?,?,?,?,1)',
        'MORA10',
        10,
        day(),
        day(179),
        2,
        100,
      ),
    ]);
  if (!(await first("SELECT id FROM users WHERE id='demo-gm'"))) {
    const salt = crypto.randomUUID();
    await q(
      'INSERT OR IGNORE INTO users(id,email,name,role,password,salt) VALUES (?,?,?,?,?,?)',
      'demo-gm',
      'gm@mora.test',
      'Meera Demo',
      'gm',
      await hash('GMDemo2026!', salt),
      salt,
    ).run();
  }
}
async function ensureInventory(dates: string[]) {
  const statements = [];
  for (const r of roomSeed)
    for (const date of dates) {
      const weekend = [5, 6].includes(new Date(date + 'T00:00:00Z').getUTCDay());
      statements.push(
        q(
          'INSERT OR IGNORE INTO inventory(room_id,date,rate,allotment,blackout) VALUES (?,?,?,?,0)',
          r.id,
          date,
          r.base + (weekend ? 100000 : 0),
          r.allotment,
        ),
      );
    }
  if (statements.length) await db().batch(statements);
}
async function user(request: Request) {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)mora_session=([^;]+)/)?.[1];
  if (!token) return null;
  return first(
    'SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?',
    await digest(token),
    Date.now(),
  );
}
function text(value: any, min = 1, max = 300) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw Error(`Enter text between ${min} and ${max} characters.`);
  return value.trim();
}
function email(value: any) {
  const e = text(value, 5, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw Error('Enter a valid email address.');
  return e;
}
function integer(value: any, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw Error(`Enter a whole number between ${min} and ${max}.`);
  return value;
}
function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
function json(body: any, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
async function audit(id: string, action: string, detail: string) {
  await q(
    'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
    id,
    action,
    detail,
    Date.now(),
  ).run();
}
function aiConfig() {
  return {
    configured: hasGeminiKey(env.GEMINI_API_KEY),
    model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    hourlyLimit: 30,
  };
}
async function finishAnalysis(enquiry: any) {
  let analysis;
  if (!hasGeminiKey(env.GEMINI_API_KEY)) {
    analysis = fallbackAnalysis(enquiry.name, enquiry.message, 'not-configured');
  } else {
    // A single SQL write atomically reserves a request slot across Worker instances.
    const slot = await q(
      "INSERT INTO audit(user_id,action,detail,created) SELECT 'automation','gemini-call',?,? WHERE (SELECT count(*) FROM audit WHERE action='gemini-call' AND created>?)<30",
      enquiry.id,
      Date.now(),
      Date.now() - 3600000,
    ).run();
    analysis = slot.meta.changes
      ? await analyzeEnquiry(enquiry, {
          apiKey: env.GEMINI_API_KEY,
          model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        })
      : fallbackAnalysis(enquiry.name, enquiry.message, 'request-limit');
  }
  // A staff edit during inference wins; do not overwrite a reviewed/sent reply.
  const update = await q(
    "UPDATE enquiries SET category=?,confidence=?,owner=?,extracted=?,draft=?,alert=?,ai_provider=?,ai_model=?,ai_status=?,ai_reason=?,status='new' WHERE id=? AND ai_status='processing' AND status=? AND draft=? AND category=?",
    analysis.category,
    analysis.confidence,
    analysis.owner,
    JSON.stringify(analysis.extracted),
    analysis.draft,
    enquiry.alert || analysis.alert ? 1 : 0,
    analysis.provider,
    analysis.model,
    analysis.state,
    analysis.reason,
    enquiry.id,
    enquiry.status,
    enquiry.draft,
    enquiry.category,
  ).run();
  return { analysis, applied: update.meta.changes > 0 };
}
async function availability(
  arrival: string,
  departure: string,
  guests: number,
  planId = 'standard',
  promoCode = '',
) {
  const dates = stayDates(arrival, departure);
  integer(guests, 1, 4);
  await ensureInventory(dates);
  const plan = await first('SELECT * FROM rate_plans WHERE id=? AND active=1', planId);
  if (!plan) throw Error('This rate plan is unavailable. Choose another plan.');
  let promo = null;
  if (promoCode) {
    const code = text(promoCode, 2, 24).toUpperCase();
    const found = await first('SELECT * FROM promos WHERE code=?', code);
    const used = await first('SELECT count(*) AS n FROM bookings WHERE promo_code=?', code);
    promo = validatePromo(found, dates, used.n);
  }
  const data = await rows(
    'SELECT i.*, (SELECT count(*) FROM nights n WHERE n.room_id=i.room_id AND n.date=i.date) AS sold FROM inventory i WHERE date>=? AND date<? ORDER BY date',
    arrival,
    departure,
  );
  return roomSeed.map((r) => {
    const nights = data.filter((n) => n.room_id === r.id);
    return {
      ...r,
      ...quoteStay(nights, plan, promo),
      available:
        r.capacity >= guests
          ? Math.max(0, Math.min(...nights.map((n) => (n.blackout ? 0 : n.allotment - n.sold))))
          : 0,
    };
  });
}
export async function handle(request: Request, path: string) {
  try {
    if (
      request.method !== 'GET' &&
      request.headers.get('origin') &&
      request.headers.get('origin') !== new URL(request.url).origin
    )
      return fail('Request origin rejected.', 403);
    if (request.headers.get('sec-fetch-site') === 'cross-site' && request.method !== 'GET')
      return fail('Request origin rejected.', 403);
    if (Number(request.headers.get('content-length') || 0) > 12000)
      return fail('Request too large.', 413);
    const raw = request.method === 'GET' ? '' : await request.text();
    if (raw.length > 12000) return fail('Request too large.', 413);
    let body: any = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return fail('Send a valid JSON request.');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body))
        return fail('Send a JSON object.');
    }
    await seed();
    await seedAdditions();
    const url = new URL(request.url),
      u = await user(request),
      method = request.method;
    if (method === 'GET' && path === 'session') return json({ user: u });
    if (method === 'GET' && path === 'plans')
      return json({
        plans: await rows('SELECT * FROM rate_plans WHERE active=1 ORDER BY adjustment,id'),
      });
    if (method === 'POST' && path === 'jobs/daily-export') {
      const supplied = request.headers.get('authorization') || '';
      const secret = env.EXPORT_JOB_SECRET;
      const privateBoundary =
        env.PRIVATE_EXPORT_AUTOMATION === 'enabled' && env.APP_ORIGIN === url.origin;
      const validSecret = secret && (await digest(supplied)) === (await digest('Bearer ' + secret));
      if (!validSecret && !privateBoundary) return fail('Export job authorization required.', 403);
      return json({ export: await dailyExport(db()) });
    }
    if (method === 'GET' && path === 'availability')
      return json({
        rooms: await availability(
          url.searchParams.get('arrival') || '',
          url.searchParams.get('departure') || '',
          Number(url.searchParams.get('guests') || 2),
          url.searchParams.get('planId') || 'standard',
          url.searchParams.get('promoCode') || '',
        ),
      });
    if (method === 'POST' && path === 'auth') {
      const b = body;
      const address = email(b.email),
        password = text(b.password, 10, 128);
      // Fixed-window throttling uses durable audit rows; no process-local counters.
      const recent = await first(
        "SELECT count(*) AS n FROM audit WHERE action='login' AND detail=? AND created>?",
        address,
        Date.now() - 600000,
      );
      if (recent.n >= 12) return fail('Too many attempts. Try again in ten minutes.', 429);
      await audit('anonymous', 'login', address);
      let account = await first('SELECT * FROM users WHERE email=?', address);
      if (b.mode === 'register') {
        if (account) return fail('This email is already registered. Sign in instead.');
        const salt = crypto.randomUUID();
        account = {
          id: crypto.randomUUID(),
          name: text(b.name, 2, 80),
          email: address,
          role: 'guest',
          salt,
          password: await hash(password, salt),
        };
        await q(
          'INSERT INTO users(id,name,email,role,salt,password) VALUES (?,?,?,?,?,?)',
          account.id,
          account.name,
          address,
          'guest',
          salt,
          account.password,
        ).run();
      } else if (!account || (await hash(password, account.salt)) !== account.password)
        return fail('Email or password is incorrect.', 401);
      const token = crypto.randomUUID() + crypto.randomUUID();
      await q(
        'INSERT INTO sessions(token,user_id,expires) VALUES (?,?,?)',
        await digest(token),
        account.id,
        Date.now() + 86400000,
      ).run();
      return json(
        { user: { id: account.id, name: account.name, email: address, role: account.role } },
        200,
        {
          'Set-Cookie': `mora_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol === 'https:' ? '; Secure' : ''}`,
        },
      );
    }
    if (method === 'POST' && path === 'logout') {
      const token = request.headers.get('cookie')?.match(/(?:^|;\s*)mora_session=([^;]+)/)?.[1];
      if (token) await q('DELETE FROM sessions WHERE token=?', await digest(token)).run();
      return json({ ok: true }, 200, {
        'Set-Cookie': 'mora_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
      });
    }
    if (method === 'POST' && path === 'enquiries') {
      const b = body;
      const name = text(b.name, 2, 80),
        address = email(b.email),
        message = text(b.message, 10, 4000);
      const channel =
        operator(u) && ['Email', 'WhatsApp'].includes(b.channel) ? b.channel : 'Web form';
      const count = await first(
        'SELECT count(*) AS n FROM enquiries WHERE email=? AND created>?',
        address,
        Date.now() - 600000,
      );
      if (count.n >= 8) return fail('Please wait before submitting another enquiry.', 429);
      const id = 'ENQ-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      const initial = fallbackAnalysis(name, message, 'processing');
      await q(
        'INSERT INTO enquiries(id,name,email,message,channel,category,confidence,owner,extracted,draft,status,alert,created,ai_provider,ai_status,ai_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id,
        name,
        address,
        message,
        channel,
        initial.category,
        initial.confidence,
        initial.owner,
        JSON.stringify(initial.extracted),
        initial.draft,
        'new',
        initial.alert,
        Date.now(),
        'local-fallback',
        'processing',
        'Saved before AI processing; requires review if processing is interrupted.',
      ).run();
      const { analysis } = await finishAnalysis({
        id,
        name,
        message,
        category: initial.category,
        draft: initial.draft,
        status: 'new',
        alert: initial.alert,
      });
      return json(
        {
          id,
          aiStatus: analysis.state,
          message: 'Your enquiry is with our team. Replies are reviewed by a person.',
        },
        201,
      );
    }
    if (!u) return fail('Please sign in to continue.', 401);
    if (method === 'GET' && path === 'bookings')
      return json({
        bookings: await rows(
          `SELECT b.*,r.name AS room_name,u.name AS guest_name,u.email FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=b.user_id ${operator(u) ? '' : 'WHERE b.user_id=?'} ORDER BY b.created DESC`,
          ...(operator(u) ? [] : [u.id]),
        ),
      });
    if (method === 'POST' && path === 'bookings') {
      const b = body;
      const requestKey = text(b.requestKey, 10, 100),
        guests = integer(b.guests, 1, 4),
        roomId = text(b.roomId),
        dates = stayDates(b.arrival, b.departure);
      const planId = b.planId === undefined ? 'standard' : text(b.planId, 2, 50);
      const promoCode = b.promoCode ? text(b.promoCode, 2, 24).toUpperCase() : null;
      const existing = await first('SELECT * FROM bookings WHERE request_key=?', requestKey);
      if (existing) {
        if (
          existing.user_id !== u.id ||
          existing.room_id !== roomId ||
          existing.arrival !== b.arrival ||
          existing.departure !== b.departure ||
          existing.guests !== guests ||
          existing.plan_id !== planId ||
          existing.promo_code !== promoCode
        )
          return fail('Payment reference already used for another request.', 409);
        return json({ booking: existing });
      }
      if (b.payment !== 'success')
        return fail('The test payment was declined. No room was reserved.', 402);
      let choices;
      try {
        choices = await availability(b.arrival, b.departure, guests, planId, promoCode || '');
      } catch (error) {
        return fail(
          error instanceof Error ? error.message : 'Booking terms changed. Refresh your quote.',
          409,
        );
      }
      const room = choices.find((r: any) => r.id === roomId);
      if (!room || !room.available)
        return fail('This stay has just sold out. Please choose another room or dates.', 409);
      if (room.total !== b.total)
        return fail('The price has changed. Refresh availability before paying.', 409);
      const id = 'MORA-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      const statements = [
        q(
          'INSERT INTO bookings(id,user_id,room_id,arrival,departure,guests,total,request_key,created,plan_id,plan_name,plan_adjustment,promo_code,discount_percent,subtotal,discount,tax) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          id,
          u.id,
          roomId,
          b.arrival,
          b.departure,
          guests,
          room.total,
          requestKey,
          Date.now(),
          room.plan.id,
          room.plan.name,
          room.plan.adjustment,
          room.promo?.code || null,
          room.promo?.percent || 0,
          room.subtotal,
          room.discount,
          room.tax,
        ),
        ...dates.map((date) =>
          q(
            'INSERT INTO nights(booking_id,room_id,date,rate,net_rate,tax) VALUES (?,?,?,?,?,?)',
            id,
            roomId,
            date,
            room.nights.find((n: any) => n.date === date)!.rate,
            room.nights.find((n: any) => n.date === date)!.net_rate,
            room.nights.find((n: any) => n.date === date)!.tax,
          ),
        ),
      ];
      // D1 batch is one transaction. Triggers re-check stock/rate inside that transaction.
      try {
        await db().batch(statements);
      } catch (e) {
        const retry = await first(
          'SELECT * FROM bookings WHERE request_key=? AND user_id=?',
          requestKey,
          u.id,
        );
        if (
          retry &&
          retry.room_id === roomId &&
          retry.arrival === b.arrival &&
          retry.departure === b.departure &&
          retry.guests === guests &&
          retry.plan_id === planId &&
          retry.promo_code === promoCode
        )
          return json({ booking: retry });
        return fail(
          'Availability or rates changed during payment. Refresh your stay; no payment was taken.',
          409,
        );
      }
      return json({ booking: await first('SELECT * FROM bookings WHERE id=?', id) }, 201);
    }
    if (!operator(u)) return fail('Reservations staff access required.', 403);
    if (method === 'POST' && path === 'inbox/route') {
      const id = text(body.id),
        category = body.category;
      if (!categories.includes(category)) return fail('Choose a valid enquiry category.');
      const old = await first('SELECT * FROM enquiries WHERE id=?', id);
      if (!old) return fail('Enquiry not found.', 404);
      const reopen = ['Complaint', 'Unsorted'].includes(category) && old.category !== category;
      await db().batch([
        q(
          'UPDATE enquiries SET category=?,owner=?,alert=?,gm_acknowledged_at=?,gm_acknowledged_by=? WHERE id=?',
          category,
          (owners as Record<string, string>)[category],
          old.alert || category === 'Complaint' ? 1 : 0,
          reopen ? null : old.gm_acknowledged_at,
          reopen ? null : old.gm_acknowledged_by,
          id,
        ),
        q(
          'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
          u.id,
          'one-click-route',
          JSON.stringify({ id, from: old.category, to: category }),
          Date.now(),
        ),
      ]);
      return json({ ok: true });
    }
    if (method === 'POST' && path === 'inbox/acknowledge') {
      if (u.role !== 'gm')
        return fail('Only the General Manager can acknowledge escalations.', 403);
      const id = text(body.id);
      const old = await first('SELECT * FROM enquiries WHERE id=?', id);
      if (!old) return fail('Enquiry not found.', 404);
      if (!old.alert && old.category !== 'Unsorted')
        return fail('This enquiry does not require GM attention.');
      await db().batch([
        q(
          'UPDATE enquiries SET gm_acknowledged_at=?,gm_acknowledged_by=? WHERE id=?',
          Date.now(),
          u.id,
          id,
        ),
        q(
          'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
          u.id,
          'gm-acknowledgement',
          id,
          Date.now(),
        ),
      ]);
      return json({ ok: true });
    }
    if (method === 'GET' && path === 'offers')
      return json({
        plans: await rows('SELECT * FROM rate_plans ORDER BY adjustment,id'),
        promos: await rows(
          'SELECT p.*,(SELECT count(*) FROM bookings b WHERE b.promo_code=p.code) AS uses FROM promos p ORDER BY p.code',
        ),
      });
    if (method === 'POST' && path === 'plans') {
      const b = body,
        id = b.id ? text(b.id, 2, 50) : 'plan-' + crypto.randomUUID().slice(0, 8);
      const name = text(b.name, 3, 70),
        description = text(b.description, 5, 250),
        adjustment = integer(b.adjustment, 0, 10000000);
      if (typeof b.active !== 'boolean') return fail('Choose whether the plan is on sale.');
      await db().batch([
        q(
          'INSERT INTO rate_plans(id,name,description,adjustment,active) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,adjustment=excluded.adjustment,active=excluded.active',
          id,
          name,
          description,
          adjustment,
          b.active ? 1 : 0,
        ),
        q(
          'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
          u.id,
          'rate-plan-update',
          id,
          Date.now(),
        ),
      ]);
      return json({ ok: true, id });
    }
    if (method === 'POST' && path === 'promos') {
      const b = body,
        code = text(b.code, 2, 24).toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(code))
        return fail('Use letters, numbers, hyphens or underscores in a promo code.');
      const validDate = (d: any) =>
        typeof d === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        Number.isFinite(Date.parse(d)) &&
        new Date(d).toISOString().slice(0, 10) === d;
      if (!validDate(b.validFrom) || !validDate(b.validUntil) || b.validUntil < b.validFrom)
        return fail('Choose a valid promo date range.');
      const percent = integer(b.percent, 1, 50),
        minNights = integer(b.minNights, 1, 14),
        maxUses = integer(b.maxUses, 1, 10000);
      if (typeof b.active !== 'boolean') return fail('Choose whether the promo is enabled.');
      const used = await first('SELECT count(*) AS n FROM bookings WHERE promo_code=?', code);
      if (maxUses < used.n)
        return fail('The booking limit cannot be lower than completed redemptions.', 409);
      try {
        await db().batch([
          q(
            'INSERT INTO promos(code,percent,valid_from,valid_until,min_nights,max_uses,active) VALUES (?,?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET percent=excluded.percent,valid_from=excluded.valid_from,valid_until=excluded.valid_until,min_nights=excluded.min_nights,max_uses=excluded.max_uses,active=excluded.active',
            code,
            percent,
            b.validFrom,
            b.validUntil,
            minNights,
            maxUses,
            b.active ? 1 : 0,
          ),
          q(
            'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
            u.id,
            'promo-update',
            code,
            Date.now(),
          ),
        ]);
      } catch {
        return fail(
          'The promo changed while being saved. Refresh and check its redemption count.',
          409,
        );
      }
      return json({ ok: true, code });
    }
    if (method === 'GET' && path === 'exports')
      return json({
        exports: await rows(
          'SELECT date,count,created,delivery FROM daily_exports ORDER BY date DESC LIMIT 90',
        ),
      });
    if (method === 'POST' && path === 'exports') {
      const date = body.date || day(-1);
      exportWindow(date);
      if (date === day())
        return fail('Daily exports close completed days. Use the booking-book CSV for today.');
      const result = await dailyExport(db(), date);
      await audit(u.id, 'daily-export', date);
      return json({ export: result });
    }
    if (method === 'GET' && path === 'exports/file') {
      const date = url.searchParams.get('date') || '';
      exportWindow(date);
      const file = await first('SELECT csv FROM daily_exports WHERE date=?', date);
      if (!file) return fail('Generate this daily export first.', 404);
      return new Response(file.csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mora-bookings-${date}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    if (method === 'GET' && path === 'inbox')
      return json({
        enquiries: await rows('SELECT * FROM enquiries ORDER BY alert DESC, created DESC'),
        ai: aiConfig(),
      });
    if (method === 'POST' && path === 'inbox/analyze') {
      const old = await first('SELECT * FROM enquiries WHERE id=?', text(body.id));
      if (!old) return fail('Enquiry not found.', 404);
      if (old.status === 'sent') return fail('Sent replies cannot be regenerated.', 409);
      if (!aiConfig().configured)
        return fail(
          'Gemini is not configured. Add GEMINI_API_KEY on the server, then restart or redeploy.',
          503,
        );
      const claim = await q(
        "UPDATE enquiries SET ai_status='processing',ai_reason='Gemini analysis requested by staff.' WHERE id=? AND ai_status!='processing' AND status=? AND draft=? AND category=?",
        old.id,
        old.status,
        old.draft,
        old.category,
      ).run();
      if (!claim.meta.changes)
        return fail('This enquiry is already processing or was edited. Refresh the inbox.', 409);
      const result = await finishAnalysis(old);
      await audit(
        u.id,
        'gemini-analysis',
        JSON.stringify({ id: old.id, applied: result.applied, state: result.analysis.state }),
      );
      return json({ ok: true, applied: result.applied, aiStatus: result.analysis.state });
    }
    if (method === 'PATCH' && path === 'inbox') {
      const b = body,
        old = await first('SELECT * FROM enquiries WHERE id=?', text(b.id));
      if (!old) return fail('Enquiry not found.', 404);
      if (!categories.includes(b.category) || !['new', 'reviewed', 'sent'].includes(b.status))
        return fail('Choose a valid category and status.');
      const draft = text(b.draft, 10, 5000);
      if (b.status === 'sent' && b.approved !== true)
        return fail('Review and approve the reply before sending.');
      // Complaint escalation is sticky even after staff re-route it.
      await db().batch([
        q(
          "UPDATE enquiries SET category=?,owner=?,draft=?,status=?,alert=?,ai_status=CASE WHEN ai_status='processing' THEN 'needs-review' ELSE ai_status END WHERE id=?",
          b.category,
          (owners as Record<string, string>)[b.category],
          draft,
          b.status,
          old.alert || b.category === 'Complaint' ? 1 : 0,
          old.id,
        ),
        q(
          'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
          u.id,
          b.status === 'sent' ? 'simulated-send' : 'enquiry-review',
          JSON.stringify({ id: old.id, from: old.category, to: b.category }),
          Date.now(),
        ),
      ]);
      return json({ ok: true });
    }
    if (method === 'GET' && path === 'rates') {
      const date = url.searchParams.get('date') || day();
      stayDates(date, day(1, new Date(date)));
      await ensureInventory([date]);
      return json({
        rates: await rows(
          'SELECT i.*,r.name,r.keys,(SELECT count(*) FROM nights n WHERE n.room_id=i.room_id AND n.date=i.date) AS sold FROM inventory i JOIN rooms r ON r.id=i.room_id WHERE i.date=?',
          date,
        ),
      });
    }
    if (method === 'PATCH' && path === 'rates') {
      const b = body;
      stayDates(b.date, day(1, new Date(b.date)));
      const r = roomSeed.find((r) => r.id === b.roomId);
      if (!r) return fail('Room not found.');
      integer(b.rate, 100000, 10000000);
      integer(b.allotment, 0, r.keys);
      if (typeof b.blackout !== 'boolean') return fail('Choose a blackout setting.');
      await ensureInventory([b.date]);
      try {
        await db().batch([
          q(
            'UPDATE inventory SET rate=?,allotment=?,blackout=? WHERE room_id=? AND date=?',
            b.rate,
            b.allotment,
            b.blackout ? 1 : 0,
            r.id,
            b.date,
          ),
          q(
            'INSERT INTO audit(user_id,action,detail,created) VALUES (?,?,?,?)',
            u.id,
            'rate-update',
            JSON.stringify(b),
            Date.now(),
          ),
        ]);
      } catch {
        return fail('Allotment cannot be lower than confirmed bookings.', 409);
      }
      return json({ ok: true });
    }
    if (method === 'GET' && path === 'export') {
      const data = await rows(
        'SELECT b.*,r.name AS room_name,u.name AS guest_name,u.email FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=b.user_id ORDER BY b.created DESC',
      );
      return new Response(bookingCsv(data), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="mora-bookings.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }
    return fail('This action is not available.', 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (/D1|SQLITE|database|no such table/i.test(message)) {
      console.error('Database request failed', message);
      return fail('Our reservation system is temporarily unavailable. Please try again.', 503);
    }
    return fail(message);
  }
}
