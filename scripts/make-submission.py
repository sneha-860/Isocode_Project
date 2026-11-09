"""Build the requested two-file ZIP. Run from repository root; requires reportlab."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from html import escape
import json
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs'
OUT.mkdir(exist_ok=True)
PDF = OUT / 'Mora-Estate-TDD.pdf'
REPO = 'https://github.com/sneha-860/Isocode_Project'
LIVE = 'https://mora-estate-coffee-stays.dynamicbolt1.chatgpt.site'
INK = HexColor('#294b3d')
MUTED = HexColor('#6d796b')
LINE = HexColor('#dde3d6')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('Hero', fontName='Times-Roman', fontSize=39, leading=43, textColor=INK, spaceAfter=20))
styles.add(ParagraphStyle('Chapter', fontName='Times-Roman', fontSize=26, leading=30, textColor=INK, spaceAfter=18))
styles.add(ParagraphStyle('Sub', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=INK, spaceBefore=14, spaceAfter=7))
styles.add(ParagraphStyle('Copy', fontName='Helvetica', fontSize=9.6, leading=14, textColor=INK, spaceAfter=8))
styles.add(ParagraphStyle('SmallCopy', fontName='Helvetica', fontSize=8, leading=11.5, textColor=MUTED, spaceAfter=8))
styles.add(ParagraphStyle('Label', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=MUTED, spaceAfter=15, charSpace=1))
styles.add(ParagraphStyle('Cell', fontName='Helvetica', fontSize=8.2, leading=11.6, textColor=INK))
story=[]
def p(s,style='Copy'): story.append(Paragraph(s,styles[style]))
def heading(s): p(s,'Sub')
def chapter(n,s):
    if story: story.append(PageBreak())
    p('MORA ESTATE  /  TECHNICAL DESIGN  /  '+n,'Label');p(s,'Chapter')
def table(headers, data, widths):
    cells=[[Paragraph(escape(str(c)),styles['Cell']) for c in row] for row in [headers]+data]
    t=Table(cells,colWidths=widths,hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#e9eee1')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),7.5),('BOTTOMPADDING',(0,0),(-1,-1),7.5),('LINEBELOW',(0,0),(-1,-1),.5,LINE)]))
    story.append(t);story.append(Spacer(1,12))
def shot(file,caption,max_height=280):
    path=ROOT/'outputs'/'qa'/file
    if not path.exists(): return
    w,h=ImageReader(str(path)).getSize();scale=min(490/w,max_height/h)
    story.append(Image(str(path),width=w*scale,height=h*scale,hAlign='LEFT'))
    story.append(Spacer(1,8));p(caption,'SmallCopy')
def bullet(s): p('&#8226; '+s)

p(f'<b>GitHub URL:</b> <link href="{REPO}" color="#294b3d">{REPO}</link>','SmallCopy')
p(f'<b>App URL:</b> <link href="{LIVE}" color="#294b3d">{LIVE}</link>','SmallCopy')
p('App access: public demo website. Booking/account and staff actions require application sign-in. Local setup is also available. See deployment.md.','SmallCopy')
p('Public access verified on 9 November 2026. Booking pages open anonymously; staff data and export jobs are protected. The previous private-only cloud task stops on public access; hosted unattended execution needs a secret-bearing scheduler. Local daily scheduling works.','SmallCopy')
story.append(Spacer(1,32));p('MORA ESTATE  /  09 NOVEMBER 2026','Label')
p('A slower stay.<br/>A faster first reply.','Hero')
p('Technical Design Document','Sub')
p('Client brief 1: Company A, Chikkamagaluru. Direct booking with enquiry classification, routing and reply assistance. Built individually, without delegated agents.')
p('The delivered core connects live nightly prices to a database-backed test reservation, and brings web, simulated email and WhatsApp enquiries into a human-reviewed inbox. The database, rather than the interface, enforces the no-overbooking rule.')
table(['Core slice','Working behavior'],[
 ['Guest booking','Availability, room detail, account, itemized GST, successful/declined test payment, confirmation and saved bookings.'],
 ['Stock administration','Date-specific rates, website allotment and blackout controls; cannot reduce stock below confirmed nights.'],
 ['Enquiry operations','Three-channel inbox, server-side classifier/extractor, assigned team, editable draft, re-route, approval and simulated send.'],
 ['Completed wider scope','Rate plans, promo administration, structured event form, GM queue/acknowledgement, one-click routing, daily CSV snapshots and background export worker.']
],[117,373])
p('Reader guide: 1 Product choices; 2 Architecture; 3 Data & stock; 4 Automation; 5 Guest design; 6 Staff design; 7 Validation & security; 8 Delivery & next steps.','SmallCopy')

chapter('01','Make the smallest useful promise.')
p('Guests should see a reliable final price and leave with a real reservation record. Staff should receive a correctly routed enquiry and a safe starting point for a reply. These are the two business-critical loops; integrating every external channel would dilute the hard inventory work.')
heading('Success and the economics in the brief')
p('The supplied baseline is approximately 17,199 occupied room nights per year. A direct-share increase from 12% to 20% means shifting about 1,376 nights. At the assumed Rs 9,500 tariff and 20% commission, that corresponds to about Rs 26.14 lakh in avoided commission, before acquisition and payment costs. Moving 15% of the 68% OTA share instead implies a 10.2 percentage-point shift, approximately 22.2% direct share and the brief\'s Rs 33.3 lakh saving.')
p('The event opportunity of Rs 72 lakh and combined Rs 1.05 crore are supplied estimates, not measured outcomes of this build. No dashboard pretends the demo has achieved them. Before a pilot, instrument source of booking, occupied nights, time to first human reply within working hours, and stock conflicts. Zero confirmed website overbookings remains a hard invariant.')
heading('Explicit assumptions: product and inventory')
table(['ID','Assumption (not established by the client brief)'],[
 ['A1','Mora Estate is a fictional brand. Photography, copy, room dimensions and amenities are illustrative.'],
 ['A2','The 64 rooms split into 40 Estate Rooms and 24 Canopy Suites, plus the specified 12 villas. Capacities are 3, 3 and 4 people, including children.'],
 ['A3','Starting nightly tariffs are Rs 7,500 / 9,500 / 16,500 before GST, with a Rs 1,000 Friday/Saturday uplift. Default website allotments are 8 / 5 / 3.'],
 ['A4','One room per booking; 1–14 nights; a rolling 180-day horizon. Breakfast is included; no extra-person fee or child pricing. Check-in 2 pm, check-out 11 am.'],
 ['A5','Two seeded plans: breakfast and full board, with editable supplements and inclusions. Staff manage inventory one day at a time. Blackout closes occupied nights to new sale without cancelling confirmations.'],
 ['A6','Team assignments are Reservations, Events team, Sales team and GM review. Actual roles are guest, reservations staff and GM; new registrations can only become guests.']
],[35,455])

chapter('02','One application. One source of truth.')
p('React and TypeScript run on the supplied Vinext/Vite starter. A Cloudflare Worker serves the UI and same-origin API. Cloudflare D1 supplies transactional SQLite storage. Drizzle defines the schema and generates migrations; explicit bound SQL makes the booking transaction and trigger behavior easy to inspect.')
table(['Layer','Choice and reason'],[
 ['Presentation','React state drives a compact multi-screen experience. Custom CSS, Lucide icons and local assets provide a consistent visual system. No external font or image host is required at runtime.'],
 ['Application','lib/service.ts owns authentication, authorization, persistence and orchestration. lib/gemini.mjs implements the server-only provider client, schema/evidence validation and fallback. lib/domain.mjs retains pricing, dates and local safeguards.'],
 ['Persistence','D1 binding DB; foreign keys, unique keys, transactional batch writes and inventory triggers. No process-memory booking records or browser-local database.'],
 ['Hosting','Sites provisions the Worker and D1 and applies versioned migrations before the matching build. Its source remote is separate from the public GitHub project.'],
 ['Automation','Gemini generateContent REST with structured JSON output. Default gemini-3.5-flash-lite, configurable on the server. Local complaint checks, deterministic team ownership, evidence validation and template fallback keep decisions reviewable.']
],[95,395])
heading('Request flow')
p('<b>Guest browser</b> &rarr; availability API &rarr; nightly inventory + occupied-night counts &rarr; server-computed quote &rarr; authenticated booking API &rarr; atomic booking/night batch &rarr; confirmation record.')
p('<b>Web form or simulated channel</b> &rarr; enquiry validation &rarr; classifier + extraction &rarr; owner + suggested draft &rarr; D1 inbox &rarr; staff edit/re-route &rarr; approved simulated send + audit event.')
heading('Separation and scale')
p('The browser cannot set the authoritative price, grant staff privileges or bypass stock checks. UI data is fetched from the API and auth cookies are HttpOnly. D1 is an appropriate simple starting point for a 76-key property; multi-property inventory, channel-manager reconciliation and asynchronous provider workflows would justify additional services.')
p('Fresh databases are migrated before serving. Data initialization then uses idempotent inserts for synthetic accounts, room types and five enquiries. Searched or edited nights receive default inventory only if missing. This is demo convenience, not a production rate-loading strategy.','SmallCopy')

chapter('03','Never sell the same night twice.')
table(['Entity','Important fields and relationships'],[
 ['users / sessions','User email unique; salted PBKDF2 hash; server-assigned role. Session stores SHA-256 token digest, user FK and expiry.'],
 ['rooms','Three types, physical-key cap, person capacity, default rate and default website allotment.'],
 ['inventory','Composite PK (room_id, date); rate in integer paise, website allotment and blackout.'],
 ['bookings','Reference, guest/room FK, dates/count, immutable plan/promo, subtotal/discount/GST/total paise snapshots, unique request key and timestamp.'],
 ['nights','Composite PK (booking_id, date), indexed room/date counts, base/net tariff and GST snapshots. Triggers guard stock and quote consistency.'],
 ['enquiries','Raw message/channel, AI provenance, extracted JSON, owner/draft/status, sticky GM alert and acknowledgement actor/time.'],
 ['audit','Actor, action, details and timestamp for rate changes, enquiry approval and login throttling.']
],[100,390])
heading('The invariant')
p('<b>For every room type and occupied date: count(confirmed nights) &le; website allotment &le; physical keys.</b> Departure is exclusive. Availability is the minimum unsold stock across every occupied night, or zero if any night is blacked out or capacity is exceeded.')
heading('Atomic confirmation')
p('The API validates dates, capacity and the server quote. A successful mock payment starts one D1 batch: insert the booking, then insert every occupied night. A BEFORE INSERT trigger re-checks current stock, nightly rate, blackout, date range and person capacity. If any night fails, the entire batch rolls back, including the parent booking. Two competing batches serialize at SQLite; a stale availability screen cannot overbook.')
p('A BEFORE UPDATE trigger blocks an allotment below sold nights or above physical keys and rejects invalid rate/blackout values. The UI provides helpful bounds, but these database rules are authoritative. Existing bookings remain when a date is closed.')
heading('Price and retry correctness')
p('Money uses integer paise. GST is rounded per nightly line: 5% at or below Rs 7,500, 18% above. Mixed tariff stays compute each night separately. A checkout with a changed total receives HTTP 409; the insert trigger also prevents a rate change between quote and commit. A unique request key returns the original booking on an identical retry and rejects reuse by another guest or payload.')
p('A declined test payment makes no booking writes. Real money would require expiring holds, a gateway-intent lifecycle, signed webhooks and reconciliation; this build makes no claim to solve those provider races.','SmallCopy')

chapter('04','Useful intelligence, with an honest boundary.')
p('New enquiries call Google Gemini from the backend when GEMINI_API_KEY is configured. The default model is gemini-3.5-flash-lite, overridable with GEMINI_MODEL. The API key stays in a server secret and request header. The response must match a JSON Schema: category, self-reported confidence, needsReview, extracted details with exact message evidence, and an unsent draft. Zod validates the actual returned object; provider schema support alone is not trusted.')
table(['Brief sample','Result / extracted facts'],[
 ['ENQ-4410: sister\'s wedding, Feb 2027, 250 guests, 2 nights','Wedding -> Events team; Feb 2027, 250 guests and 2 nights.'],
 ['ENQ-4411: villa, 14–16 Nov, 2 adults and a child','Room booking -> Reservations; 14–16 Nov, 2 adults and 1 child. No year is invented.'],
 ['ENQ-4412: team of 45, January offsite, conference hall','Corporate offsite -> Sales team; January and 45 guests. No precise date is invented.'],
 ['Additional synthetic examples','A dirty-room complaint always alerts GM. An unspecified special request is Unsorted -> GM review.']
],[250,240])
heading('Extraction and safe reply drafts')
p('Extracted dates and budgets must match exact evidence substrings; numeric values must occur as digits or simple number words in their evidence. Unsupported values become null and require human review. The villa sample keeps 2 adults and 1 child separate; no total or year is inferred. Drafts are checked for detected prices, booking confirmations, links and sensitive-data requests. Unsafe output falls back to a local template. Formal prices remain database-controlled, and no draft is sent automatically.')
heading('When it is wrong or unsure')
bullet('Confidence below 0.7, explicit uncertainty or unsupported extracted facts enter Unsorted. Scores are model self-reports, not calibrated accuracy. Every result still needs staff verification.')
bullet('Complaint keywords override room/event intent and set a persistent alert. Staff re-routing never silently removes that alert. Alerts are in-app; no external GM notification is claimed.')
bullet('Staff select a corrected category, see the mapped owner immediately, edit and save. Approve & simulate send requires an explicit approval flag in the server request and records an audit event.')
heading('Known limits and next evaluation')
p('The enquiry is saved before inference. Missing keys, 12-second timeouts, quota/network errors, blocked or invalid responses produce local review drafts; there is no automatic retry. An atomic SQL reservation limits the app to 30 provider calls/hour. Staff can explicitly regenerate unsent samples; edits made during inference win. Historical seed records stay labelled local until regenerated. Prompt injection, subtle hallucinations and incomplete contact redaction remain risks; no multilingual or held-out accuracy claim is made.')

chapter('05','Design the stay, then get out of its way.')
shot('01-home-desktop.png','Guest home at 1440px. A single booking task, a restrained forest palette and locally served photography.',260)
p('White space, warm paper, forest green, editorial serif headings and system sans-serif working text create a quiet identity. Photos sell a feeling; the availability form remains the primary action. Image assets are compressed WebP, with a roughly 76 KB mobile hero and no third-party image fetch during a page view.')
table(['Screen','Decision and working behavior'],[
 ['Home / availability','Date inputs, one-room guest count and live stock. Room cards show full-stay totals, tax split and availability. Sold-out/capacity states offer date changes instead of a broken checkout.'],
 ['Room detail','Amenities and demo policies sit beside a complete price summary. All policy and room details are identified as assumptions.'],
 ['Checkout / confirmation','Three logical steps: choose stay; details and payment; confirmation. Inline sign-in preserves the selected stay. Decline and stale-price errors explain the next action. Confirmation persists and can be printed.'],
 ['Structured enquiry','Purpose, optional date/guest/budget fields, message and sample-data consent. Submission creates a real record; success gives a reference.']
],[112,378])
p('Responsive grids collapse to one column on phones. Native inputs, associated labels, visible focus, keyboard-contained auth dialog, Escape dismissal, reduced-motion handling, skeletons, error notices and empty states support access. The build passes tested 390px overflow checks; a formal screen-reader/contrast audit remains future work.','SmallCopy')

chapter('06','A desk built around the next action.')
shot('05-inbox-desktop.png','Reservations desk at desktop width. Inbox context, routing, extracted facts and editable reply share one working surface.',280)
p('The guest brand continues into the desk: enquiries, rates/allotment, plans/promos and bookings, plus a dedicated GM attention view. Restrained category colors, channel markers and status badges provide useful signals; there are no fabricated conversion metrics.')
heading('Inbox workflow')
p('Open a message, verify facts, correct the category if necessary, edit the draft, then save or explicitly approve the simulated send. The review filter includes Unsorted and sticky complaint alerts. Search matches reference, name and message. Email/WhatsApp ingress is simulated through an actual server action rather than precomputed UI labels.')
heading('Daily inventory workflow')
p('Choose a date. Each room type shows its physical-key cap, editable rate/allotment, sold and remaining stock, and tax-inclusive price. A blackout stops new sales for that night. Validation errors preserve entered values; successful writes immediately affect subsequent guest searches. Existing confirmations survive edits. Multi-date/bulk editing is intentionally deferred.')
heading('Booking book')
p('Staff inspect confirmed bookings and download CSVs; guests see only their own records. Completed-day snapshots are stored by India creation date with plan, promo and tax fields. Background export generation runs without an open browser; reservation-system delivery is explicitly simulated.')

chapter('06B','Complete the daily work, too.')
shot('10-plans-promos.png','Rate-plan and promo administration: editable inclusions, supplements, validity and redemption limits.',235)
heading('Commercial terms are guarded at commit')
p('rate_plans stores inclusions, supplement and on-sale state; promos stores code, percentage, occupied-night validity, minimum stay and booking cap. Guests select them before checkout. Booking snapshots preserve original terms after later admin edits. SQL triggers re-check plan/promo state and count redemptions inside the booking transaction, alongside every-night stock guards.')
heading('Explicit added assumptions: A13 and A14')
p('A13: full board adds Rs 2,500 per room/night for all booked guests. MORA10 gives 10% off a minimum two-night stay, capped at 100 bookings and valid for the seeded horizon. Admins may change these illustrative terms. One percentage code applies before nightly GST; the discounted package tariff determines the band. Real commercial tax treatment needs resort approval.')
p('A14: daily_exports stores one immutable CSV per completed India booking-creation day, including empty days. Generation is due at 06:00 Asia/Kolkata. The local launcher starts a background worker automatically; the public hosted writer requires its job secret. The prior private-only task stops on public access; a secret-bearing hosted scheduler remains to be configured. Repeated runs reuse the file. Reservation-system import is simulated.')
heading('GM acknowledgement and one-click correction')
p('The GM signs in separately and sees all escalations, pending counts and acknowledgement history. Only this role can acknowledge an alert. Acknowledgement does not erase complaint history. Quick-route buttons change category/owner immediately; re-escalation opens attention again. Draft editing stays separate from routing and external send approval.')

chapter('07','Evidence over a happy-path demo.')
table(['Check','Verified result'],[
 ['TypeScript / production build','npm run typecheck and npm run build pass. The built Worker serves the app locally.'],
 ['Domain + real SQLite triggers','16 domain/SQL tests cover stock and quote rollback, plan/promo snapshots, final-redemption limits, GST rounding, India dates and idempotent daily CSV snapshots, plus the original classifier/date safeguards.'],
 ['Gemini mocked-provider tests','13 additional tests cover header-only keys, contact redaction, structured/evidence validation, uncertainty, complaint overrides, unsafe output, schema failures, quota/auth/network errors and timeout fallback. These are not live-model tests.'],
 ['API integration','Actual Worker/D1: last-room race gives 1 success and 7 conflicts; last-promo race gives 1 redemption. Stale plan prices fail; retries preserve the reference.'],
 ['API security and errors','Guest/staff/GM access, guest isolation, declined payment, quote changes, stock guards, one-click routing, GM-only acknowledgement, approval gate, protected export job/CSV and origin rejection pass.'],
 ['Real Chrome UI','Desktop/390px Chrome: full-board promo booking through confirmation, staff rates/offers/daily exports, live Gemini regeneration and GM acknowledgement. No detected JS errors or mobile overflow.']
],[118,372])
heading('Basic security controls')
p('All SQL uses bound parameters. Input text lengths, email shape, integers, date validity, room capacities, role permissions and current prices are checked server-side. Bodies are consumed and validated before access rejection; invalid JSON or oversized payloads fail. Cross-origin mutations are rejected. Passwords use unique salts and 100,000 PBKDF2-SHA256 iterations; random session tokens are hashed in storage and sent as HttpOnly, SameSite cookies, with Secure on HTTPS and 24-hour expiry.')
p('New registrations cannot create staff. Login attempts are durably throttled per address. HTML renders user content as text, and CSV cells are quoted and protected from leading spreadsheet formula characters. Database failures return generic customer messages. Environment files, local databases, deployment credentials and browser profiles are ignored by Git.')
heading('What the tests do not prove')
p('The load test is small and local; no long-running production load, provider webhook, backup restore, penetration test, screen-reader test or multilingual accuracy evaluation is claimed. Tests use synthetic data and disposable booking dates. Public demo credentials intentionally permit evaluation, not production security.')
heading('Privacy boundary')
p('Only synthetic guest data is seeded. Gemini receives contact-redacted enquiry text, excluding account fields; redaction is not full anonymization. The form discloses processing. Real launch needs approved provider/privacy terms, consent, retention/deletion and incident operations. No DPDP compliance claim is made.')

chapter('08','Ship the core. Name the next risks.')
heading('Delivery and reproducibility')
p('The public repository URL is at the top of this document. Source history is preserved. deployment.md supplies local setup, exact migration commands, the public hosting address, demo accounts, environment/binding names and a reviewer walkthrough. The ZIP contains exactly this PDF and deployment.md; the code stays in GitHub.')
heading('Explicit assumptions: evaluation and operations')
table(['ID','Assumption / limitation'],[
 ['A7','Public demo logins are intentional; registration is unverified. No password recovery or staff invitation workflow is included.'],
 ['A8','Payments are synchronous test outcomes. Incoming/outgoing emails, WhatsApp and reservation-system delivery are simulated; no real message is sent.'],
 ['A9','Gemini is used only when a server key is configured. Local templates are explicit fallbacks, not disguised live AI. Team ownership and GM attention are application fields, not external notifications.'],
 ['A10','The user requested public Sites access for review. Synthetic demo logins are intentionally published; this is an evaluation build.'],
 ['A11','GST is implemented as 5% up to Rs 7,500 per unit/night and 18% above, with tax rounded nightly in paise. The resort must validate its actual tax treatment before commercial launch.'],
 ['A12','All booking defaults, server date validation and export-day boundaries use Asia/Kolkata. Daily exports cover the previous completed India creation day at 06:00.']
],[35,455])
heading('Cuts, in order of intention')
p('All requested booking, rate/allotment/promo administration, AI inbox, structured enquiry and daily export features are implemented. External payments, messaging and reservation-system handoff remain simulated as permitted. Bulk editing, cancellations/refunds and real gateway reconciliation are extra launch scope. Loyalty, restaurants and replacement of the reservation system remain excluded.')
heading('Next seven-week production path (planning assumption)')
p('Weeks 1–2: validate room inventory/policies, approve photography and tariffs, harden identity and guest privacy. Weeks 3–4: gateway holds, signed webhooks and reconciliation with repeatable concurrency tests. Week 5: verified message adapters and external on-call notifications. Week 6: consent/retention, backup restore and performance/accessibility checks. Week 7: staff pilot, stock reconciliation and monitored release. Budget/time in the brief are constraints, not spend or delivery already achieved.')
p('<b>Sources and provenance.</b> Requirements and commercial figures: supplied Company A brief. All invented brand/content/rates/policies/technical decisions are assumptions identified here. Photography provenance is in docs/asset-credits.md; images do not depict Company A. AI assistance accelerated implementation and tests; no measured business outcome is inferred from the demo.','SmallCopy')
chapter('09','Reference and review route.')
heading('Tax implementation references')
p('The brief asks for GST at the rate applicable to the tariff. The following primary sources were used only to verify that implementation; no new client requirements were inferred.')
p('<b>Ministry of Finance / PIB.</b> Frequently Asked Questions 2 on decisions of the 56th GST Council, 16 September 2025. Describes the 5% treatment for accommodation up to Rs 7,500 per unit/day. <link href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2167151">Read the official FAQ</link>.')
p('<b>CBIC.</b> Goods and services rate schedule, Heading 9963: accommodation tariff bands and standard rate. <link href="https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html">Read the official schedule</link>. Rates are implemented in price() and checked at the exact threshold in the domain tests. Commercial tax treatment still needs resort validation.')
p('Discount valuation: <link href="https://cbic-gst.gov.in/hindi/sectoral-faq.html">CBIC sectoral FAQs, Section 15(3)</link>. Invoice-recorded before-supply discounts are excluded from taxable value; promo reductions and tax are stored explicitly in the booking.','SmallCopy')
heading('Gemini API references and live verification')
p('Google: <link href="https://ai.google.dev/gemini-api/docs/structured-output">structured JSON output</link>, <link href="https://ai.google.dev/api/generate-content">generateContent reference</link>, and <link href="https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</link>. These inform the provider adapter, not client scope. The regular test suite mocks provider responses; the separate live check uses a real configured key and three synthetic brief enquiries. API usage can consume quota or incur charges. Secret values are never included in the ZIP.')
live_report=OUT/'gemini-live-check.json'
if live_report.exists():
    report=json.loads(live_report.read_text())
    if report.get('verified'):
        p('Recorded live verification: all three synthetic brief enquiries returned the expected categories through '+escape(report.get('model','Gemini'))+'. This is a three-fixture integration check, not a measured accuracy benchmark.','SmallCopy')
    else:
        p('Live provider verification is not recorded as passing in this generated copy; configure the key and run npm run test:gemini:live.','SmallCopy')
heading('A practical five-minute review')
table(['Action','What to inspect'],[
 ['1. Find a stay','Choose dates, inspect room capacity, nightly prices and the total with GST.'],
 ['2. Test both payments','Use the guest demo account. Decline once, then confirm. Check the booking reference and saved account record.'],
 ['3. Check stock','Sign in as staff. Compare sold and available stock for an occupied night. Try lowering allotment below the sold count.'],
 ['4. Review the inbox','Inspect the three supplied samples, complaint alert and Unsorted message. Edit and re-route; explicitly approve a simulated send.'],
 ['5. Add a new message','Simulate an incoming email/WhatsApp or use Gather here. See fresh inference and persistent records, then download the booking CSV.']
],[120,370])
heading('Reproduce the evidence')
p('deployment.md gives the exact setup and test commands. Domain tests use in-memory SQLite with the real committed triggers. Integration tests use the running local Worker/D1 and mutate a disposable fixture. Browser checks use actual headless Chrome at desktop and phone widths. Screenshots are illustrative verification evidence, not a substitute for trying the flows.')

def footer(canvas,doc):
    canvas.setStrokeColor(LINE);canvas.line(48,43,547,43)
    canvas.setFillColor(MUTED);canvas.setFont('Helvetica',7)
    canvas.drawString(48,29,'MORA ESTATE  /  TECHNICAL DESIGN  /  EVALUATION BUILD')
    canvas.drawRightString(547,29,f'{doc.page}')
doc=SimpleDocTemplate(str(PDF),pagesize=(595.28,841.89),rightMargin=52,leftMargin=52,topMargin=43,bottomMargin=60,title='Mora Estate — Technical Design',author='Mora Estate project')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
with ZipFile(OUT/'Mora-Estate-Submission.zip','w',ZIP_DEFLATED) as z:
    z.write(PDF,PDF.name);z.write(ROOT/'deployment.md','deployment.md')
with ZipFile(OUT/'Mora-Estate-Submission.zip') as z:
    assert sorted(z.namelist())==['Mora-Estate-TDD.pdf','deployment.md']
assert (OUT/'Mora-Estate-Submission.zip').stat().st_size<25*1024*1024
print(f'Created {PDF.name} and two-file ZIP ({(OUT/"Mora-Estate-Submission.zip").stat().st_size:,} bytes)')
