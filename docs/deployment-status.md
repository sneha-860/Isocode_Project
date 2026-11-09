# Full-brief release deployment status

Recorded on 9 November 2026.

The complete implementation is verified locally: 29 automated tests, TypeScript/build, original and full-brief API suites, desktop/390px Chrome, three live Gemini fixtures, and real draft regeneration. The local launcher automatically started the unattended daily-export worker and generated/read back its durable CSV without a browser open.

Features include booking and tax, immutable plan/promo snapshots, daily rates/allotment/blackouts, atomic room and promo limits, structured event enquiries, Gemini routing/drafts/fallback, one-click correction, GM acknowledgement/history and daily export generation with simulated reservation-system import.

## Hosting

Site project: `appgprj_6af18bbab52c81918657adf657cb7568`.

Owner-private URL: https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site.

Hosted runtime revision 2 includes the Gemini and export secrets, plus owner-private export automation settings. No values are recorded here. Publication of the complete release is being verified separately. No hosted cloud schedule has been claimed as active until its writer readback and schedule creation pass.

Earlier Gemini-only version 2 failed publication after an account concurrency limit and generic “Failed to publish the built site.” Last historical failed deployment: `appgdep_6af1ed39ff948191bb2c87afecd1f810`. It is not the complete release. No application-code cause was established from runtime logs.

Use the local setup for review unless a later confirmed publication/readback result is recorded below. Never broaden sharing to make a job work. A future public deployment must disable private-boundary automation and require explicit job-secret authentication.

## Unattended export

Source instructions: `.openai/daily-export.md`. Local startup and `npm run exports:watch` run the same protected writer at 06:00 Asia/Kolkata. HTTP writer and stored CSV readback have passed locally. A hosted schedule must use supported Site service access and be created only after publication and actual writer verification. The backend is idempotent by completed India date, so retries cannot duplicate imports. Delivery remains simulated as required by the brief.
