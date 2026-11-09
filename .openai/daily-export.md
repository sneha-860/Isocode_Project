# Public deployment notice

The Site is now public at the user's request. The previous private-only Sites cloud task must stop as instructed; its service-access credential alone does not authorize this writer. Hosted runtime revision 3 disables PRIVATE_EXPORT_AUTOMATION. Public unattended execution requires EXPORT_JOB_SECRET supplied securely by a scheduler environment, never embedded in task prompts or source. Local scheduling and authenticated staff exports remain available. No public cloud runner with that secret has been configured.

The following historical private-mode instructions apply only if owner-private access is intentionally restored and verified.

# Daily booking export

At 06:00 Asia/Kolkata each day, generate the previous completed India-calendar day's booking export. The reservation-system handoff is intentionally simulated.

Site project: `appgprj_6af18bbab52c81918657adf657cb7568`.

Writer: `POST https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site/api/jobs/daily-export` with JSON `{}`. Read the same Site with `get_site` to obtain the current service-access credential, then send it only to this Site in the `OAI-Sites-Authorization: Bearer ...` header. Do not print, persist or embed the credential in commands, prompts, logs or source. Use an in-memory header or stdin. This owner-private writer explicitly relies on Sites dispatch authorization and the hosted-only `PRIVATE_EXPORT_AUTOMATION` configuration. It cannot access guest accounts or call Gemini.

Verify the JSON readback includes `export.date`, `export.count` and `export.delivery=simulated`. The export is stored durably under its date; repeated runs return that same snapshot and do not duplicate imports. A zero-booking day still has a valid CSV. Staff can download the stored file in Bookings → Daily handoff.

If the endpoint or service access is unavailable, report the failure; do not broaden sharing, print credentials or pretend an export ran. Retry the same writer when available. No source edit or republishing is needed for normal daily runs. If audience becomes public, disable private-boundary automation and configure explicit job-secret authentication before scheduling again.
