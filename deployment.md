# Mora Estate — deployment and reviewer guide

GitHub: https://github.com/sneha-860/Isocode_Project

Sites address: https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site

The Sites deployment is owner-private. A reviewer can run the complete app locally; a public GitHub repository does not grant access to a private Sites app.

## Prerequisites

Node.js 24 LTS (the SQLite test runner uses `node:sqlite`), npm, Git, and an internet connection for dependency installation. Windows, macOS or Linux. A Gemini API key and available quota are required for live AI processing; without a key, the booking app still works and enquiries enter human review with safe local drafts. Google Chrome is optional for browser checks. Python 3 with ReportLab is optional to rebuild the submission PDF/ZIP.

## Local setup

```sh
git clone https://github.com/sneha-860/Isocode_Project.git
cd Isocode_Project
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_confused_boomer.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_inventory_guards.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_supreme_lionheart.sql
npm start -- --port 4173
```

Open http://127.0.0.1:4173. On the first API request, an idempotent data initializer creates demo accounts, room types and five sample enquiries. Nightly inventory is initialized for searched/edited dates, preserving existing edits. Schema is created only by the migrations, never by a web request.

Apply each migration once, in order, to a new local database. Local data persists in ignored `.wrangler/state`. If the tables already exist, skip their migration instead of replaying it. Development with hot reload is available through `npm run dev` after local migration; it uses the same persistent state. Stop the built preview before rebuilding on Windows, where the server may lock generated files.

If a brand-new cloned repository has no lockfile, run `npm install`; the published project includes its lockfile. Do not commit `.wrangler`, runtime state, browser profiles, environment files or tokens.

## Enable live Gemini processing

1. Create a Gemini API key in Google AI Studio: https://aistudio.google.com/apikey.
2. Copy `.dev.vars.example` to `.dev.vars` in the project root (beside `package.json`). This is a file, not a folder.
3. Edit `.dev.vars` and put your key after `GEMINI_API_KEY=`. Leave `GEMINI_MODEL` empty to use the default, or choose an available compatible model. Never paste the key into chat, source code or GitHub.
4. Stop the preview with Ctrl+C and run `npm start -- --port 4173` again. The preview loader resolves the root secret file explicitly and never copies it into build output.
5. Run `npm run test:gemini:live` to make three synthetic calls. A missing key reports SKIPPED; provider or fixture failures report failure. No API key is printed.
6. Sign in as staff. The inbox shows whether Gemini is configured. Submit a new enquiry or choose an unsent seeded record and click **Regenerate draft with Gemini**. Seed records remain clearly labelled as local until this action runs.

For an existing installation from the first build, stop the preview, pull updates, run `npm run build`, and apply only the new `0002_supreme_lionheart.sql` migration. Do not replay earlier migrations. Then restart the preview.

The default model is `gemini-3.5-flash-lite`; confirm availability for your Google project. Requests use the supported `generateContent` REST endpoint with JSON Schema output. The API key is sent only in the request header, not a URL or browser bundle. Actual API usage may consume quota or incur provider charges.

Gemini returns category, self-reported confidence, extracted fields with source evidence, and an unsent draft. The backend validates types, bounds and evidence, applies complaint escalation and blocks detected invented prices, booking confirmations, links or sensitive-data requests. Low confidence, uncertain intent or unsupported facts need human review. Staff still own the final decision.

Timeouts (12 seconds), authentication errors, quota errors, blocked/incomplete responses or invalid JSON all retain the saved enquiry and produce a safe review fallback. There is no automatic retry. An atomic global budget limits the application to 30 Gemini calls per hour; the standalone live-check script deliberately makes its own diagnostic calls. The inbox displays provider/model/fallback provenance. Save a manual review before retrying an interrupted processing record.

## Demo logins (synthetic; intentionally public)

| Role | Email | Password |
|---|---|---|
| Guest | `guest@mora.test` | `GuestDemo2026!` |
| Reservations staff | `reservations@mora.test` | `StaffDemo2026!` |

The sign-in dialog can fill either account. New registration always creates a guest. Login is throttled to 12 attempts per email in ten minutes; wait before retrying if you reach the limit. Accounts are for evaluation only. Use fictional details and no real card or passport data.

## Demo walkthrough

1. Find a stay, choose a room and reserve it. Sign in at checkout.
2. Select **Declined payment** to see a recoverable error. No room is reserved. Then select **Successful payment**, accept the demo policy and complete checkout.
3. Check confirmation and **My bookings**. Sign out with the icon or footer action.
4. Sign in as staff. Review the sample inbox, provider label, category/owner, extracted fields and editable draft. **Needs review** includes uncertain/fallback messages and complaint alerts. Older samples use local drafts until explicitly regenerated with Gemini.
5. Re-route with the category selector and save. **Approve & simulate send** records explicit approval; no external message leaves the app. Complaint alerts remain after re-routing.
6. Simulate incoming email/WhatsApp or submit **Gather here** as a guest. Both create persistent enquiries and run classification.
7. Change daily rates, website allotment or blackout in **Rates & allotment**. Stock cannot be lowered below confirmed bookings. Guest checkout rejects stale rates.
8. View staff bookings and download the CSV. It exports the confirmed booking book; automated daily delivery to a reservation system is deferred.

## Tests

```sh
npm run typecheck
npm test
npm run test:gemini:live
npm run build
# Start the server in another terminal, using a fresh disposable database:
npm run test:integration
# Optional, with Chrome installed:
npm run test:browser
```

The API suite mutates only the configured test server, reserves days 170–171 and adds synthetic records. Run once per fresh fixture. `TEST_BASE_URL` can change the test target; never use a production URL. Browser checks add a guest account and test booking, and capture desktop/390px screenshots. `CHROME_PATH` selects a Chrome executable. Stop the local server with Ctrl+C.

## Deployment

The application builds to `dist/client` and a Worker entry point under `dist/server`. `.openai/hosting.json` declares its Sites project and the D1 binding `DB`. Sites provisions the database, applies the versioned SQL migrations, uploads the matching build artifact, and deploys a saved source version. Persist the existing project ID; do not create a second Site for edits. Local and hosted databases are separate.

Source commits are pushed before packaging. Only the saved version built from that exact commit is published. The source repository for Sites hosting is separate from the public GitHub mirror. Preserve both remotes. The deployment workflow must report success before the address is treated as live.

For a standalone Cloudflare deployment, create a D1 database, configure a real binding, apply the committed migrations, upload `dist/server` with its module layout and `dist/client` assets, and deploy the built Worker. Do not deploy the local placeholder database ID. This alternative is documented, not independently exercised here.

## Environment and bindings (names only)

- `DB` — required D1 database binding, provisioned by Sites or local Wrangler.
- `GEMINI_API_KEY` — Gemini credential; keep in ignored `.dev.vars` locally and a secret runtime variable in Sites. Never use a public/frontend prefix or commit its value.
- `GEMINI_MODEL` — optional compatible model identifier; defaults in server code to `gemini-3.5-flash-lite`.
- `CHROME_PATH` — optional browser test executable.
- `TEST_BASE_URL` — optional integration-test endpoint.
- `TEST_STAY_OFFSET` — optional disposable integration-test booking offset; defaults to 170 days.
- `WRANGLER_SEND_METRICS` — optional hosting-tool telemetry setting.

Payments, email, WhatsApp and reservation-system delivery are simulated. A real launch would add gateway and messaging credentials through the deployment secret store; those integrations and variables are not part of this build.

Configure `GEMINI_API_KEY` with the Sites environment-variable tool or hosting settings and mark it secret, then deploy a saved version to apply that environment revision. The local `.dev.vars` file is not uploaded. Updating an environment variable alone does not update an already running saved deployment.

When enabled, enquiry text is processed by Google. Names/emails from account fields are not sent; message text receives basic email/phone redaction. This is not complete anonymization. Use fictional data for review; a real launch needs suitable provider data terms, privacy notice, consent and retention decisions.

## Recreate the requested ZIP

```sh
python -m pip install reportlab
python scripts/make-submission.py
```

Output: `outputs/Mora-Estate-Submission.zip`, containing exactly `Mora-Estate-TDD.pdf` and `deployment.md`. Screenshot inclusion uses `outputs/qa` when browser QA has run. The generator does not include code, runtime records, credentials or other files in the ZIP.
