'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Check,
  Download,
  CalendarDays,
  ShieldCheck,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { api, post, date, human, money, ErrorBox, Empty } from './shared';

export function Offers({ notify }: any) {
  const [plans, setPlans] = useState<any[]>([]),
    [promos, setPromos] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const b = await api('offers');
      setPlans(b.plans.map((p: any) => ({ ...p, _key: p.id })));
      setPromos(b.promos.map((p: any) => ({ ...p, _key: p.code, persisted: true })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const planChange = (key: string, field: string, value: any) =>
    setPlans((d) => d.map((p) => (p._key === key ? { ...p, [field]: value } : p)));
  const promoChange = (key: string, field: string, value: any) =>
    setPromos((d) => d.map((p) => (p._key === key ? { ...p, [field]: value } : p)));
  return (
    <>
      <div className="desk-title">
        <div>
          <div className="eyebrow">A MORE PERSONAL STAY</div>
          <h1>Plans, with a little extra.</h1>
          <p>Manage inclusions and direct-booking offers. Prices remain server-controlled.</p>
        </div>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      <div className="inventory-banner">
        <ShieldCheck size={23} />
        <div>
          <strong>Every quote is checked again at payment.</strong>
          <p>
            Discounts apply per night before GST. Promo validity covers every occupied night; one
            code per booking.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="skeleton table-skeleton" />
      ) : (
        <>
          <div className="rates-heading">
            <h3>Rate plans</h3>
            <button
              className="text-link"
              onClick={() =>
                setPlans((d) => [
                  ...d,
                  {
                    _key: crypto.randomUUID(),
                    id: '',
                    name: '',
                    description: '',
                    adjustment: 0,
                    active: 1,
                  },
                ])
              }
            >
              <Plus size={15} /> Add rate plan
            </button>
          </div>
          <div className="offer-grid">
            {plans.map((p) => (
              <form
                className="offer-card"
                key={p._key}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(p._key);
                  setError('');
                  try {
                    await post('plans', {
                      id: p.id || undefined,
                      name: p.name,
                      description: p.description,
                      adjustment: Math.round(p.adjustment),
                      active: !!p.active,
                    });
                    notify('Rate plan saved. New quotes use these terms.');
                    await load();
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy('');
                  }
                }}
              >
                <fieldset disabled={!!busy}>
                  <div className="offer-card-heading">
                    <UtensilsCrossed size={20} />
                    <span className={'badge ' + (p.active ? 'green' : 'neutral')}>
                      {p.active ? 'On sale' : 'Paused'}
                    </span>
                  </div>
                  <label>
                    Plan name
                    <input
                      required
                      minLength={3}
                      maxLength={70}
                      value={p.name}
                      onChange={(e) => planChange(p._key, 'name', e.target.value)}
                      placeholder="e.g. Full board"
                    />
                  </label>
                  <label>
                    What is included
                    <textarea
                      required
                      minLength={5}
                      maxLength={250}
                      rows={2}
                      value={p.description}
                      onChange={(e) => planChange(p._key, 'description', e.target.value)}
                    />
                  </label>
                  <label>
                    Added nightly tariff <small>INR per room, before discount/GST</small>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      value={p.adjustment / 100}
                      onChange={(e) =>
                        planChange(p._key, 'adjustment', Number(e.target.value) * 100)
                      }
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!p.active}
                      onChange={(e) => planChange(p._key, 'active', e.target.checked ? 1 : 0)}
                    />{' '}
                    Available for new bookings
                  </label>
                  <button className="button full">
                    {busy === p._key ? 'Saving…' : 'Save rate plan'}
                    <Check size={15} />
                  </button>
                </fieldset>
              </form>
            ))}
          </div>
          <div className="rates-heading">
            <h3>Direct-booking promos</h3>
            <button
              className="text-link"
              onClick={() =>
                setPromos((d) => [
                  ...d,
                  {
                    _key: crypto.randomUUID(),
                    code: '',
                    percent: 10,
                    valid_from: date(),
                    valid_until: date(179),
                    min_nights: 2,
                    max_uses: 100,
                    active: 1,
                    uses: 0,
                    persisted: false,
                  },
                ])
              }
            >
              <Plus size={15} /> Add promo
            </button>
          </div>
          <div className="offer-grid">
            {promos.map((p) => (
              <form
                className="offer-card"
                key={p._key}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(p._key);
                  setError('');
                  try {
                    await post('promos', {
                      code: p.code,
                      percent: Number(p.percent),
                      validFrom: p.valid_from,
                      validUntil: p.valid_until,
                      minNights: Number(p.min_nights),
                      maxUses: Number(p.max_uses),
                      active: !!p.active,
                    });
                    notify('Promo saved. Completed bookings keep their original totals.');
                    await load();
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy('');
                  }
                }}
              >
                <fieldset disabled={!!busy}>
                  <div className="offer-card-heading">
                    <Tag size={20} />
                    <span className={'badge ' + (p.active ? 'green' : 'neutral')}>
                      {p.uses} redeemed · {p.active ? 'Enabled' : 'Paused'}
                    </span>
                  </div>
                  <div className="form-row">
                    <label>
                      Promo code
                      <input
                        required
                        minLength={2}
                        maxLength={24}
                        pattern="[A-Za-z0-9_-]+"
                        disabled={p.persisted}
                        value={p.code}
                        onChange={(e) => promoChange(p._key, 'code', e.target.value.toUpperCase())}
                      />
                    </label>
                    <label>
                      Discount %
                      <input
                        required
                        type="number"
                        min="1"
                        max="50"
                        value={p.percent}
                        onChange={(e) => promoChange(p._key, 'percent', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      First occupied night
                      <input
                        required
                        type="date"
                        value={p.valid_from}
                        onChange={(e) => promoChange(p._key, 'valid_from', e.target.value)}
                      />
                    </label>
                    <label>
                      Last occupied night
                      <input
                        required
                        type="date"
                        min={p.valid_from}
                        value={p.valid_until}
                        onChange={(e) => promoChange(p._key, 'valid_until', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Minimum nights
                      <input
                        required
                        type="number"
                        min="1"
                        max="14"
                        value={p.min_nights}
                        onChange={(e) => promoChange(p._key, 'min_nights', e.target.value)}
                      />
                    </label>
                    <label>
                      Booking limit
                      <input
                        required
                        type="number"
                        min={Math.max(1, p.uses)}
                        max="10000"
                        value={p.max_uses}
                        onChange={(e) => promoChange(p._key, 'max_uses', e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!p.active}
                      onChange={(e) => promoChange(p._key, 'active', e.target.checked ? 1 : 0)}
                    />{' '}
                    Enabled for eligible stays
                  </label>
                  <button className="button full">
                    {busy === p._key ? 'Saving…' : 'Save promo'}
                    <Check size={15} />
                  </button>
                </fieldset>
              </form>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function DailyExports({ notify }: any) {
  const [selectedDate, setSelectedDate] = useState(date(-1)),
    [data, setData] = useState<any[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setData((await api('exports')).exports);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <section className="daily-exports">
      <div className="rates-heading">
        <div>
          <div className="eyebrow">THE DAILY HANDOFF</div>
          <h3>Ready for reservations.</h3>
        </div>
        <CalendarDays size={22} />
      </div>
      <p>
        Completed-day CSV snapshots use India time. Automatic export runs at 6 am; delivery to the
        reservation system is simulated. Re-running a day returns its existing file.
      </p>
      <form
        className="export-controls"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await post('exports', { date: selectedDate });
            notify('Daily export is ready. Reservation-system delivery is simulated.');
            await load();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Booking creation date
          <input
            required
            type="date"
            max={date(-1)}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? 'Preparing…' : 'Prepare daily CSV'}
          <Download size={15} />
        </button>
      </form>
      {error && <ErrorBox message={error} onRetry={load} />}
      {loading ? (
        <div className="skeleton" style={{ height: 70 }} />
      ) : !data.length ? (
        <Empty
          icon={<Download />}
          title="The first handoff is yours"
          text="Prepare a completed day, including an empty day, to see its export here."
        />
      ) : (
        <div className="export-list">
          {data.map((r) => (
            <div key={r.date}>
              <div>
                <strong>{human(r.date)}</strong>
                <span>{r.count} bookings · delivery simulated</span>
              </div>
              <a
                className="button outline small"
                href={'/api/exports/file?date=' + r.date}
                download
              >
                Download CSV <Download size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
