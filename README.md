# Mora Estate

A direct-booking experience for the hill-resort brief, with a working reservations desk.

**Repository:** https://github.com/sneha-860/Isocode_Project

**Sites address:** https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site (owner-private; use local setup for independent review).

The Gemini integration is verified locally and published in this repository. The hosted update encountered a publication failure; the address above is the previous confirmed release. See [deployment status](docs/deployment-status.md). The local app uses the configured Gemini key now.

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
- Gemini classifies enquiries, extracts grounded details and drafts replies through a server-only REST call. Set `GEMINI_API_KEY` in ignored `.dev.vars` to enable it locally. The configurable default model is `gemini-3.5-flash-lite`. Model confidence is self-reported and uncalibrated.
- Missing keys, timeouts, quota/provider failures and invalid output produce a local template in the human-review lane. Complaints still alert the GM. Seed records retain their local-sample label until staff explicitly regenerate them with Gemini.
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
| `lib/gemini.mjs` | Server-only Gemini client, structured schema, evidence validation, redaction and safe fallback |
| `db/schema.ts`, `drizzle/` | Schema and versioned migrations, including inventory guards |
| `tests/` | Domain/SQL, API integration and real Chrome UI checks |
| `scripts/make-submission.py` | Reproducible two-file submission ZIP |

The starter's retained UI library and hosting helpers are under `components/`, `scripts/` and `vendor/`. Its reference is in `docs/starter-reference.md`.

## Checks

```sh
npm run typecheck
npm test
npm run test:gemini:live
npm run build
# With the local built server running on port 4173:
npm run test:integration
npm run test:browser
```

Integration testing reserves the last room on days 170–171. Run it against a fresh disposable local database, once per fixture. Never target live data. Browser testing launches local Chrome and saves screenshots under ignored `outputs/qa/`; set `CHROME_PATH` on other systems.

`npm run test:gemini:live` makes up to three real API calls with synthetic brief samples and reports a failure or skip honestly. It reads `.dev.vars` without printing the key. The regular tests mock the provider and require no key. In the app, a global atomic budget permits at most 30 provider calls per hour; calls have a 12-second timeout and no automatic retry.

## Enable Gemini

Copy `.dev.vars.example` to `.dev.vars` and add your Google AI Studio key after `GEMINI_API_KEY=`. The file lives in the repository root, not a `dev` folder. Restart the preview after saving. Do not commit the key or put it in frontend variables. `npm start` explicitly loads this root file even though the generated Wrangler configuration lives under `dist/server`.

Add `GEMINI_API_KEY` separately as a secret in the hosted Sites environment, then deploy a saved version to apply it. Local files are never uploaded. `GEMINI_MODEL` is optional. Enquiry text is sent to Google when enabled; basic contact redaction is applied, but is not a complete anonymizer. Use fictional sample data.

## Deliberate limits

One room per booking, one breakfast rate plan, stays of 1–14 nights within 180 days. The brand, room split, capacities, inventory, tariffs, policies and imagery are labelled demo assumptions in the TDD. No channel manager, real payment gateway, message delivery, cancellation/refund, promo code or bulk rate editor. GM alerts are persistent queue flags visible to reservations; a separate GM login is not implemented in this two-role core slice.

This is an evaluation deployment with public demo credentials. A real launch needs staff provisioning, verified guest accounts/password recovery, abuse protection, payment webhooks and reconciliation, privacy/retention operations, backups, monitoring, classifier evaluation on actual enquiries, and client-approved rates, policies and photography.
