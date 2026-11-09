'use client';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Coffee,
  Leaf,
  X,
} from 'lucide-react';
export const date = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n / 100);
export const human = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export const content: Record<string, any> = {
  estate: {
    image: 'room',
    label: 'CLOSE TO NATURE',
    size: '38 m²',
    description:
      'Morning light, warm wood and a balcony looking out over the coffee estate. A little room to slow down.',
    features: [
      'Estate-view balcony',
      'King bed · extra bed on request',
      'Breakfast included',
      'Rain shower',
    ],
    tag: 'The everyday escape',
  },
  canopy: {
    image: 'suite',
    label: 'A LITTLE MORE ROOM',
    size: '58 m²',
    description:
      'Tucked into the treetops, with a generous living space and a private sit-out. Let the forest set the pace.',
    features: [
      'Separate lounge and bedroom',
      'Private forest-facing sit-out',
      'Breakfast included',
      'Deep soaking bathtub',
    ],
    tag: 'Room to linger',
  },
  villa: {
    image: 'villa',
    label: 'YOUR OWN CORNER',
    size: '112 m²',
    description:
      'A quiet home among the hills, with your own pool, sunlit living spaces and all the privacy you came for.',
    features: [
      'Private plunge pool',
      'Two bedrooms · up to 4 guests',
      'Breakfast included',
      'Private garden and deck',
    ],
    tag: 'A stay of your own',
  },
};
export async function api(path: string, options: RequestInit = {}) {
  const r = await fetch('/api/' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const b: any = await r.json();
  if (!r.ok) throw Error(b.error || 'Something went wrong. Please try again.');
  return b;
}
export const post = (path: string, body: any, method = 'POST') =>
  api(path, { method, body: JSON.stringify(body) });
export const categoryClass = (c: string) =>
  c === 'Wedding'
    ? 'rose'
    : c === 'Corporate offsite'
      ? 'blue'
      : c === 'Complaint'
        ? 'red'
        : c === 'Unsorted'
          ? 'amber'
          : 'green';
export function SearchBar({ stay, onSearch, loading }: any) {
  const [local, setLocal] = useState(stay);
  useEffect(() => setLocal(stay), [stay]);
  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(local);
      }}
    >
      <label>
        <span>
          <CalendarDays size={13} /> CHECK-IN
        </span>
        <input
          aria-label="Check-in date"
          required
          type="date"
          min={date()}
          max={date(179)}
          value={local.arrival}
          onChange={(e) => {
            const arrival = e.target.value;
            if (!arrival) {
              setLocal({ ...local, arrival });
              return;
            }
            setLocal({
              ...local,
              arrival,
              departure:
                arrival >= local.departure
                  ? new Date(+new Date(arrival) + 86400000).toISOString().slice(0, 10)
                  : local.departure,
            });
          }}
        />
      </label>
      <label>
        <span>
          <CalendarDays size={13} /> CHECK-OUT
        </span>
        <input
          aria-label="Check-out date"
          required
          type="date"
          min={
            local.arrival
              ? new Date(+new Date(local.arrival) + 86400000).toISOString().slice(0, 10)
              : date(1)
          }
          max={date(180)}
          value={local.departure}
          onChange={(e) => setLocal({ ...local, departure: e.target.value })}
        />
      </label>
      <label className="guest-field">
        <span>
          <Users size={13} /> GUESTS
        </span>
        <select
          aria-label="Guests including children"
          value={local.guests}
          onChange={(e) => setLocal({ ...local, guests: Number(e.target.value) })}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} guest{n !== 1 ? 's' : ''} · 1 room
            </option>
          ))}
        </select>
      </label>
      <button className="button search-button" disabled={loading}>
        {loading ? 'Checking…' : 'Find your stay'}
        {loading ? <RefreshCw className="spin" size={17} /> : <ArrowUpRight size={19} />}
      </button>
    </form>
  );
}
export function PriceLines({ room }: any) {
  return (
    <div className="price-lines">
      <div>
        <span>Room · breakfast included</span>
        <strong>{money(room.subtotal)}</strong>
      </div>
      <div>
        <span>
          GST <small>(nightly tariff based)</small>
        </span>
        <strong>{money(room.tax)}</strong>
      </div>
      <div className="total">
        <span>Total for your stay</span>
        <strong>{money(room.total)}</strong>
      </div>
    </div>
  );
}
export function ErrorBox({ message, onRetry }: any) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={19} />
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry}>
          Try again <RefreshCw size={13} />
        </button>
      )}
    </div>
  );
}
export function Empty({ icon, title, text, action }: any) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function AuthModal({ onClose, onSuccess }: any) {
  const [mode, setMode] = useState('login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', listener);
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', listener);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            const els = e.currentTarget.querySelectorAll<HTMLElement>('button,input,select');
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <button className="modal-close icon-btn" aria-label="Close sign in" onClick={onClose}>
          <X size={20} />
        </button>
        <Leaf size={30} strokeWidth={1.2} />
        <div className="eyebrow">YOUR LITTLE ESCAPE</div>
        <h2 id="auth-title">{mode === 'login' ? 'Welcome back.' : 'Make yourself at home.'}</h2>
        <p>
          {mode === 'login'
            ? 'Sign in to book a stay or visit your reservations.'
            : 'Create a guest account. Use fictional details for this demo.'}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              onSuccess((await post('auth', { mode, email, password, name })).user);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === 'register' && (
            <label>
              Your name
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && <ErrorBox message={error} />}
          <button className="button full" disabled={busy}>
            {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create guest account'}
            <ArrowRight size={17} />
          </button>
        </form>
        <button
          className="text-link centered"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
        <div className="demo-accounts">
          <span className="eyebrow">EXPLORE THE DEMO</span>
          <div>
            <button
              onClick={() => {
                setMode('login');
                setEmail('guest@mora.test');
                setPassword('GuestDemo2026!');
              }}
            >
              Use guest account <ArrowUpRight size={14} />
            </button>
            <button
              onClick={() => {
                setMode('login');
                setEmail('reservations@mora.test');
                setPassword('StaffDemo2026!');
              }}
            >
              Use staff account <ArrowUpRight size={14} />
            </button>
          </div>
          <small>Public evaluation accounts. Sample data only.</small>
        </div>
      </section>
    </div>
  );
}
