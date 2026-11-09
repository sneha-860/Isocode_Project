import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  salt: text('salt').notNull(),
  role: text('role').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expires: integer('expires').notNull(),
});
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull(),
  keys: integer('keys').notNull(),
  base: integer('base').notNull(),
  allotment: integer('allotment').notNull(),
});
export const inventory = sqliteTable(
  'inventory',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id),
    date: text('date').notNull(),
    rate: integer('rate').notNull(),
    allotment: integer('allotment').notNull(),
    blackout: integer('blackout').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.date] })],
);
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),
  arrival: text('arrival').notNull(),
  departure: text('departure').notNull(),
  guests: integer('guests').notNull(),
  total: integer('total').notNull(),
  planId: text('plan_id').notNull().default('standard'),
  planName: text('plan_name').notNull().default('Breakfast included'),
  planAdjustment: integer('plan_adjustment').notNull().default(0),
  promoCode: text('promo_code'),
  discountPercent: integer('discount_percent').notNull().default(0),
  subtotal: integer('subtotal'),
  discount: integer('discount').notNull().default(0),
  tax: integer('tax'),
  requestKey: text('request_key').notNull().unique(),
  created: integer('created').notNull(),
});
export const nights = sqliteTable(
  'nights',
  {
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id),
    date: text('date').notNull(),
    rate: integer('rate').notNull(),
    netRate: integer('net_rate'),
    tax: integer('tax'),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.date] })],
);
export const enquiries = sqliteTable('enquiries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  channel: text('channel').notNull(),
  category: text('category').notNull(),
  confidence: integer('confidence').notNull(),
  owner: text('owner').notNull(),
  extracted: text('extracted').notNull(),
  draft: text('draft').notNull(),
  status: text('status').notNull().default('new'),
  alert: integer('alert').notNull().default(0),
  gmAcknowledgedAt: integer('gm_acknowledged_at'),
  gmAcknowledgedBy: text('gm_acknowledged_by'),
  aiProvider: text('ai_provider').notNull().default('legacy-local'),
  aiModel: text('ai_model'),
  aiStatus: text('ai_status').notNull().default('legacy'),
  aiReason: text('ai_reason')
    .notNull()
    .default('Local sample or enquiry created before Gemini integration.'),
  created: integer('created').notNull(),
});
export const audit = sqliteTable('audit', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  created: integer('created').notNull(),
});
export const ratePlans = sqliteTable('rate_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  adjustment: integer('adjustment').notNull().default(0),
  active: integer('active').notNull().default(1),
});
export const promos = sqliteTable('promos', {
  code: text('code').primaryKey(),
  percent: integer('percent').notNull(),
  validFrom: text('valid_from').notNull(),
  validUntil: text('valid_until').notNull(),
  minNights: integer('min_nights').notNull().default(1),
  maxUses: integer('max_uses').notNull(),
  active: integer('active').notNull().default(1),
});
export const dailyExports = sqliteTable('daily_exports', {
  date: text('date').primaryKey(),
  csv: text('csv').notNull(),
  count: integer('count').notNull(),
  created: integer('created').notNull(),
  delivery: text('delivery').notNull().default('simulated'),
});
