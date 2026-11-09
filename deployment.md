# Mora Estate — deployment and reviewer guide

GitHub: https://github.com/sneha-860/Isocode_Project

Sites address: https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site

The Sites deployment is owner-private. A reviewer can run the complete app locally; a public GitHub repository does not grant access to a private Sites app.

## Prerequisites

Node.js 24 LTS (the SQLite test runner uses `node:sqlite`), npm, Git, and an internet connection for dependency installation. Windows, macOS or Linux. No API keys or paid services are required locally. Google Chrome is optional for the browser checks. Python 3 with ReportLab is optional to rebuild the submission PDF/ZIP.

## Local setup

```sh
git clone https://github.com/sneha-860/Isocode_Project.git
cd Isocode_Project
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_confused_boomer.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_inventory_guards.sql
npm start -- --port 4173
```

Open http://127.0.0.1:4173. On the first API request, an idempotent data initializer creates demo accounts, room types and five sample enquiries. Nightly inventory is initialized for searched/edited dates, preserving existing edits. Schema is created only by the migrations, never by a web request.

Apply each migration once, in order, to a new local database. Local data persists in ignored `.wrangler/state`. If the tables already exist, skip their migration instead of replaying it. Development with hot reload is available through `npm run dev` after local migration; it uses the same persistent state. Stop the built preview before rebuilding on Windows, where the server may lock generated files.

If a brand-new cloned repository has no lockfile, run `npm install`; the published project includes its lockfile. Do not commit `.wrangler`, runtime state, browser profiles, environment files or tokens.

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
4. Sign in as staff. Review the sample inbox, category/owner, extracted fields and editable draft. **Needs review** includes low-confidence and complaint alerts.
5. Re-route with the category selector and save. **Approve & simulate send** records explicit approval; no external message leaves the app. Complaint alerts remain after re-routing.
6. Simulate incoming email/WhatsApp or submit **Gather here** as a guest. Both create persistent enquiries and run classification.
7. Change daily rates, website allotment or blackout in **Rates & allotment**. Stock cannot be lowered below confirmed bookings. Guest checkout rejects stale rates.
8. View staff bookings and download the CSV. It exports the confirmed booking book; automated daily delivery to a reservation system is deferred.

## Tests

```sh
npm run typecheck
npm test
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
- No application secrets or AI provider keys are required by this demo.
- `CHROME_PATH` — optional browser test executable.
- `TEST_BASE_URL` — optional integration-test endpoint.
- `WRANGLER_SEND_METRICS` — optional hosting-tool telemetry setting.

Payments, email, WhatsApp and reservation-system delivery are simulated. A real launch would add gateway and messaging credentials through the deployment secret store; those integrations and variables are not part of this build.

## Recreate the requested ZIP

```sh
python -m pip install reportlab
python scripts/make-submission.py
```

Output: `outputs/Mora-Estate-Submission.zip`, containing exactly `Mora-Estate-TDD.pdf` and `deployment.md`. Screenshot inclusion uses `outputs/qa` when browser QA has run. The generator does not include code, runtime records, credentials or other files in the ZIP.
