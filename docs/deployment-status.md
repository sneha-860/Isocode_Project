# Full-brief release deployment status

Confirmed on 9 November 2026.

The complete implementation is deployed successfully at https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site. Access is now public at the user's request. The public repository and local setup support independent review.

## Verified release

- Source commit: `b3712dda1f35efd950803ca62d713a950a69fc43`.
- Site: `appgprj_6af18bbab52c81918657adf657cb7568`.
- Saved version: `appgprj_6af18bbab52c81918657adf657cb7568~appgver_107fb85c333081919a5fb43f61ec7064` (version 3).
- Successful deployment: `appgdep_6af202928a3c8191a70f9e2d1e5cef68`, runtime environment revision 2.
- Native publication status: `succeeded` at 17:28 UTC / 22:58 India time.
- Hosted GET `/api/plans`: HTTP 200, two seeded plans.
- Hosted protected POST `/api/jobs/daily-export`: HTTP 200; durable readback for `2026-11-08`, zero bookings, delivery `simulated`.

Local verification passed 29 automated tests, TypeScript/build, original and full-brief API suites, desktop/390px Chrome, three real Gemini fixtures and real draft regeneration. The local launcher also started its unattended export worker without a browser.

Booking, plans/promos, rates/allotment/blackouts, atomic room and promo limits, structured enquiries, Gemini routing/drafts/fallback, one-click correction, GM acknowledgement and daily CSV snapshots are implemented. External payments, messaging and reservation-system delivery remain simulated as the brief permits.

## Public access update

Runtime revision 3 was successfully deployed as `appgdep_6af205c5e420819192c15c953b36e972`, then access policy revision 2 made the Site public. Anonymous home and plans return 200, inbox 401 and export job 403. An export request authenticated with the job secret returns 200 and the persisted snapshot. `PRIVATE_EXPORT_AUTOMATION` is disabled; the Gemini and export secrets are preserved.

## Earlier daily cloud schedule

Linked automation: `Automation_c650acd00a208191a799229152646bfe`, **Prepare Mora Estate daily booking export**.

Saved task enabled: yes, but its instructions explicitly stop on public access. It is therefore not an operational public scheduler. Public unattended scheduling needs a secure job-secret-bearing runner; no such cloud runner is currently configured. Local automatic exports and staff-created hosted snapshots remain available. Original timing: daily at 06:00 `Asia/Kolkata`. The protected writer was exercised through its intended Sites service access and returned the persisted result before scheduling. The first scheduled occurrence has not yet run; saving the schedule is not evidence of a scheduled execution. Local and hosted databases are separate.

The writer is idempotent by completed India date. Zero-booking days have valid CSVs. Staff can download snapshots under Bookings > Daily handoff. Normal runs do not republish the app. Instructions are recorded in `.openai/daily-export.md`; no credentials are stored there or in the task prompt.

Earlier version-2 publication failures are superseded by this successful full release. Public access is intentional. Private-boundary automation has been disabled; unattended writers require explicit job-secret authentication.
