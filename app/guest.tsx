'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LockKeyhole,
  RefreshCw,
  Download,
  BedDouble,
  Leaf,
  Coffee,
} from 'lucide-react';
import { content, api, post, money, human, date, PriceLines, ErrorBox, Empty } from './shared';
export function Checkout({ user, room, stay, onBack, onComplete, onRefresh }: any) {
  const [payment, setPayment] = useState('success'),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [key, setKey] = useState('');
  useEffect(() => setKey(crypto.randomUUID()), []);
  return (
    <div className="page-wrap checkout-page">
      <button className="text-link back" onClick={onBack}>
        <ArrowLeft size={16} /> Back to your room
      </button>
      <div className="checkout-steps">
        <span>
          <Check size={14} /> Choose your stay
        </span>
        <i />
        <span className="current">2 &nbsp; Details & test payment</span>
        <i />
        <span>3 &nbsp; Confirmation</span>
      </div>
      <div className="detail-layout">
        <div>
          <div className="eyebrow">YOU’RE ALMOST HERE</div>
          <h1>
            A little closer
            <br />
            <em>to doing less.</em>
          </h1>
          <div className="checkout-block">
            <span className="step-label">01 &nbsp; YOUR DETAILS</span>
            <div className="guest-details">
              <div className="avatar">
                <Users size={20} />
              </div>
              <div>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <span className="badge green">Signed in</span>
            </div>
            <p className="muted">Saved to this account. Please use demo details only.</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                onComplete(
                  (
                    await post('bookings', {
                      ...stay,
                      roomId: room.id,
                      total: room.total,
                      payment,
                      requestKey: key,
                    })
                  ).booking,
                );
              } catch (e: any) {
                setError(e.message);
                if (payment === 'decline') setKey(crypto.randomUUID());
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="checkout-block">
              <span className="step-label">02 &nbsp; TEST PAYMENT</span>
              <div className="test-notice">
                <LockKeyhole size={19} />
                <div>
                  <strong>A real flow. A test payment.</strong>
                  <p>No card details needed. No money will be charged.</p>
                </div>
              </div>
              {[
                [
                  'success',
                  'Successful payment',
                  'Confirm the reservation and reduce available stock',
                  CheckCircle2,
                ],
                [
                  'decline',
                  'Declined payment',
                  'Try the error flow · no room will be reserved',
                  AlertCircle,
                ],
              ].map(([v, title, description, Icon]: any) => (
                <label key={v} className={'radio-card ' + (payment === v ? 'chosen' : '')}>
                  <input
                    type="radio"
                    name="payment"
                    value={v}
                    checked={payment === v}
                    onChange={() => setPayment(v)}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <Icon size={19} />
                </label>
              ))}
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I understand this is a demo booking. I agree to the demo stay policy and the use of
                my sample details for this reservation.
              </span>
            </label>
            {error && <ErrorBox message={error} />}
            <button className="button full checkout-pay" disabled={busy || !consent}>
              {busy ? 'Confirming your stay…' : `Pay ${money(room.total)} in test mode`}
              {busy ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
            </button>
            {error && (
              <button className="text-link centered" type="button" onClick={onRefresh}>
                Refresh prices & availability
              </button>
            )}
            <div className="secure-note">
              <ShieldCheck size={14} /> Availability is checked again when you pay.
            </div>
          </form>
        </div>
        <aside className="booking-summary checkout-summary">
          <img src={`/images/${content[room.id].image}.webp`} alt={room.name} />
          <div className="summary-inner">
            <div className="eyebrow">YOUR STAY</div>
            <h3>{room.name}</h3>
            <div className="summary-dates">
              <div>
                <span>CHECK-IN</span>
                <strong>{human(stay.arrival)}</strong>
              </div>
              <ArrowRight size={15} />
              <div>
                <span>CHECK-OUT</span>
                <strong>{human(stay.departure)}</strong>
              </div>
            </div>
            <p>
              {stay.guests} guests · {room.nights.length} nights · 1 room
            </p>
            <PriceLines room={room} />
            <details className="nightly-details">
              <summary>See nightly price breakdown</summary>
              {room.nights.map((n: any) => (
                <div key={n.date}>
                  <span>
                    {human(n.date)}
                    <small>GST {n.rate <= 750000 ? '5' : '18'}%</small>
                  </span>
                  <strong>
                    {money(n.rate + Math.round(n.rate * (n.rate <= 750000 ? 0.05 : 0.18)))}
                  </strong>
                </div>
              ))}
            </details>
            <span className="secure-note">
              <Coffee size={14} /> Breakfast is included
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
export function Bookings({ staff, onExplore }: any) {
  const [data, setData] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api('bookings')
      .then((b) => setData(b.bookings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  return (
    <div className={staff ? '' : 'page-wrap'}>
      <div className="desk-title">
        <div>
          <div className="eyebrow">{staff ? 'RESERVATIONS' : 'YOUR TIME IN THE HILLS'}</div>
          <h1>{staff ? 'The booking book.' : 'Your little escapes.'}</h1>
          <p>
            {staff
              ? 'Every confirmed direct booking, in one place.'
              : 'Confirmed stays, saved to your account.'}
          </p>
        </div>
        {staff && (
          <a className="button outline" href="/api/export" download>
            <Download size={16} /> Export bookings
          </a>
        )}
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {loading ? (
        <div className="skeleton table-skeleton" />
      ) : !data.length ? (
        <Empty
          icon={<BedDouble />}
          title="A quiet beginning"
          text={
            staff
              ? 'New bookings appear here after a successful test payment.'
              : 'Your next chapter in the hills is still unwritten.'
          }
          action={
            <button className="button" onClick={onExplore}>
              Find a stay <ArrowUpRight size={16} />
            </button>
          }
        />
      ) : (
        <div className="booking-list">
          {data.map((b) => (
            <article key={b.id} className="booking-record">
              <div className="booking-record-head">
                <strong>{b.id}</strong>
                <span className="badge green">
                  <Check size={12} /> Confirmed · test
                </span>
              </div>
              <div className="booking-record-body">
                <img src={`/images/${content[b.room_id].image}.webp`} alt={b.room_name} />
                <div>
                  <h3>{b.room_name}</h3>
                  <p>
                    {human(b.arrival)} — {human(b.departure)}
                  </p>
                  <span>
                    {b.guests} guests · 1 room {staff && `· ${b.guest_name} · ${b.email}`}
                  </span>
                </div>
                <strong>{money(b.total)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export function EnquiryForm({ user, notify }: any) {
  const [name, setName] = useState(user?.name || ''),
    [email, setEmail] = useState(user?.email || ''),
    [kind, setKind] = useState('Wedding'),
    [message, setMessage] = useState(''),
    [arrival, setArrival] = useState(''),
    [guests, setGuests] = useState(''),
    [budget, setBudget] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState('');
  return (
    <div className="page-wrap enquiry-page">
      <div className="enquiry-intro">
        <div className="eyebrow">MAKE A LITTLE SPACE FOR TOGETHER</div>
        <h1>
          Your people.
          <br />
          Our little
          <br />
          <em>corner of the hills.</em>
        </h1>
        <p>
          A wedding, an offsite, or just a question about a stay. Tell us what you have in mind. A
          person from our team will take it from here.
        </p>
        <div className="enquiry-note">
          <Leaf size={24} strokeWidth={1} />
          <p>
            Good hospitality starts with listening.
            <br />
            Share a little. We’ll help with the rest.
          </p>
        </div>
        <img
          src="/images/estate.webp"
          alt="Green surroundings at a secluded retreat"
          loading="lazy"
        />
      </div>
      <div className="enquiry-form-card">
        {done ? (
          <Empty
            icon={<CheckCircle2 />}
            title="A lovely place to begin."
            text={`Enquiry ${done} is with our team. Your message is saved; no email or WhatsApp is sent in this demo.`}
            action={
              <button
                className="button outline"
                onClick={() => {
                  setDone('');
                  setMessage('');
                }}
              >
                Send another enquiry
              </button>
            }
          />
        ) : (
          <>
            <h3>Let’s plan something good.</h3>
            <p className="muted">Please use fictional details for this demo.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  const b = await post('enquiries', {
                    name,
                    email,
                    message: `${kind} enquiry. ${arrival ? `Dates: ${arrival}. ` : ''}${guests ? `${guests} guests. ` : ''}${budget ? `Budget: ₹${budget}. ` : ''}${message}`,
                    channel: 'Web form',
                  });
                  setDone(b.id);
                  notify('Your enquiry has been saved.');
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                I’m thinking about
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  {['Wedding', 'Corporate offsite', 'Room booking', 'Something else'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Your name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Email address
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Preferred date <small>optional</small>
                  <input
                    type="date"
                    min={date()}
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                  />
                </label>
                <label>
                  Number of guests <small>optional</small>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={guests}
                    placeholder="e.g. 45"
                    onChange={(e) => setGuests(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Approximate budget in INR <small>optional</small>
                <input
                  type="number"
                  min="0"
                  max="100000000"
                  placeholder="e.g. 500000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
              <label>
                Tell us a little more
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  placeholder="The occasion, what you're imagining, and anything we should know…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <label className="checkbox-label">
                <input required type="checkbox" />
                <span>
                  I agree to have my sample enquiry stored and, when enabled, sent to Google Gemini
                  for analysis. A person reviews every reply.
                </span>
              </label>
              {error && <ErrorBox message={error} />}
              <button className="button full" disabled={busy}>
                {busy ? 'Sending to our team…' : 'Send your enquiry'}
                <ArrowUpRight size={17} />
              </button>
              <span className="secure-note">Every reply is reviewed by a person.</span>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
