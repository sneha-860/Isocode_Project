# Client brief 1 — implementation coverage

All product assumptions are in the TDD. This is the permitted test-mode build, not a claim of commercial launch or achieved business KPIs.

| Requirement | Working implementation / verification |
|---|---|
| Room photos, availability, rate plans and GST-inclusive prices | Guest availability and room details; database plan supplements and per-night discounted GST. Unit, API and Chrome checks. |
| Payment and confirmation | Explicit successful/declined mock payment, immutable booking record, saved guest history and printable confirmation. |
| Daily rate, allotment, blackout and promo administration | Staff inventory screen and Plans & promos. Promo date range, minimum nights, percent and use limit; create/edit/pause. |
| Never overbook website allotment | Transactional D1 batch and SQL triggers for every occupied night. Last-room race: one success, seven conflicts. |
| Unified web/email/WhatsApp inbox | Real web submissions and server-backed simulated email/WhatsApp ingress. No real external message delivery, per scope. |
| AI classification, extraction, owner and reply | Real Gemini structured JSON; evidence validation, team assignment, unsent editable draft, explicit staff approval. Live synthetic checks and mocked failure tests. |
| Wrong/uncertain AI | Unsorted/GM review, safe timeout/error fallback, one-click route changes and persistent complaint escalation. |
| GM can see escalations | Dedicated GM role, attention view, unread count, acknowledgement and retained audit history. |
| Structured wedding/event form | Purpose, preferred date, number of guests, budget and message, creating a persistent enquiry. |
| Daily reservation-system export | Durable daily CSV by India creation date, plan/promo/tax snapshots, protected unattended writer, automatic local scheduler; external import explicitly simulated. Hosted activation depends on confirmed publication and is reported separately. |
| Responsive design and states | Designed guest/staff screens, 390px and desktop checks, error/loading/empty states and protected editing during AI work. |
| Backend/database/sign-in/roles | Worker API, D1, guest/staff/GM accounts, hashed passwords/sessions, validation, guest isolation and protected actions. |
| Submission | Public GitHub and history; regenerated ZIP containing exactly TDD PDF and deployment.md. |

Allowed simulations: payments, incoming/outgoing message transport and reservation-system handoff. Exclusions: replacing reservation/channel-manager systems, loyalty and restaurant bookings. Production privacy operations, real gateway webhooks and commercial content approval are launch work; no full legal-compliance certification is claimed.
