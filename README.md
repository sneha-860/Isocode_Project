# Mora Estate

A direct-booking experience for the hill-resort brief, with a working reservations desk.

**Repository:** https://github.com/sneha-860/Isocode_Project

**Sites address:** https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site (owner-private; use local setup for independent review).

## Review in five minutes

Follow [deployment.md](deployment.md), then open the local app.

1. Choose dates and a room. Sign in using **Use guest account**, or register with fictional details.
2. Try a declined payment, then a successful payment. The confirmation and saved booking use database records.
3. Sign out. Use **Staff sign in → Use staff account**.
4. In **Rates & allotment**, change a nightly rate, limit stock or close a date. Refresh guest availability to see the change.
5. Open the inbox. The three brief samples are seeded alongside a complaint and an uncertain enquiry. Re-route, edit, save and approve a reply. Simulate an incoming email or WhatsApp to classify a new message.
6. Export bookings as CSV. Messages and payments are explicitly simulated.

## Implementation

- React + TypeScript using the supplied Vinext/Vite starter; a Cloudflare Worker serves UI and API.
- Cloudflare D1 / SQLite persists accounts, opaque sessions, nightly inventory, reservations, enquiries and audit events.
- Atomic booking batches and SQL triggers enforce capacity, blackout, unchanged rates and every-night stock.
- A small multinomial Naive Bayes text classifier runs on the server. Extraction and reply templates are deterministic automation. No external AI key is needed. Model scores are not calibrated probabilities.
- Roles are enforced in the API; guests can read only their own bookings. New accounts are always guests.

## Source map

| Path | Responsibility |
|---|---|
| `app/page.tsx` | Guest shell, room search/detail and confirmation |
| `app/guest.tsx` | Checkout, booking history and structured enquiries |
| `app/staff.tsx` | Staff inbox and daily rate/allotment editor |
| `app/shared.tsx` | Shared API client, sign-in dialog, display helpers |
| `lib/service.ts` | Authentication, authorization, persistence and API actions |
| `lib/domain.mjs` | Classification, extraction, templates, date and price logic |
| `db/schema.ts`, `drizzle/` | Schema and versioned migrations, including inventory guards |
| `tests/` | Domain/SQL, API integration and real Chrome UI checks |
| `scripts/make-submission.py` | Reproducible two-file submission ZIP |

The starter's retained UI library and hosting helpers are under `components/`, `scripts/` and `vendor/`. Its reference is in `docs/starter-reference.md`.

## Checks

```sh
npm run typecheck
npm test
npm run build
# With the local built server running on port 4173:
npm run test:integration
npm run test:browser
```

Integration testing reserves the last room on days 170–171. Run it against a fresh disposable local database, once per fixture. Never target live data. Browser testing launches local Chrome and saves screenshots under ignored `outputs/qa/`; set `CHROME_PATH` on other systems.

## Deliberate limits

One room per booking, one breakfast rate plan, stays of 1–14 nights within 180 days. The brand, room split, capacities, inventory, tariffs, policies and imagery are labelled demo assumptions in the TDD. No channel manager, real payment gateway, message delivery, cancellation/refund, promo code or bulk rate editor. GM alerts are persistent queue flags visible to reservations; a separate GM login is not implemented in this two-role core slice.

This is an evaluation deployment with public demo credentials. A real launch needs staff provisioning, verified guest accounts/password recovery, abuse protection, payment webhooks and reconciliation, privacy/retention operations, backups, monitoring, classifier evaluation on actual enquiries, and client-approved rates, policies and photography.
