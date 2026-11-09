'use client';
import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Leaf,
  MapPin,
  Menu,
  X,
  Users,
  Check,
  Coffee,
  Wifi,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Inbox,
  SlidersHorizontal,
  BedDouble,
  LogOut,
  CheckCircle2,
  Flower2,
} from 'lucide-react';
import {
  date,
  money,
  human,
  content,
  api,
  post,
  SearchBar,
  PriceLines,
  ErrorBox,
  AuthModal,
} from './shared';
import { Checkout, Bookings, EnquiryForm } from './guest';
import { InboxView, Rates } from './staff';
export default function App() {
  const [view, setView] = useState('home'),
    [user, setUser] = useState<any>(null),
    [auth, setAuth] = useState(false),
    [authNext, setAuthNext] = useState(''),
    [menu, setMenu] = useState(false),
    [stay, setStay] = useState({ arrival: date(5), departure: date(7), guests: 2 }),
    [rooms, setRooms] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [confirmation, setConfirmation] = useState<any>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(''), 4500);
  };
  useEffect(() => {
    api('session')
      .then((b) => setUser(b.user))
      .catch((e) => notify(e.message));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMenu(false);
    setError('');
  }, [view]);
  const search = async (next = stay) => {
    setStay(next);
    setLoading(true);
    setError('');
    setView('stays');
    try {
      setRooms(
        (
          await api(
            `availability?arrival=${next.arrival}&departure=${next.departure}&guests=${next.guests}`,
          )
        ).rooms,
      );
    } catch (e: any) {
      setRooms([]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const navigate = (v: string) => setView(v);
  const choose = (r: any) => {
    setSelected(r);
    navigate('detail');
  };
  const checkout = () => {
    if (!user) {
      setAuthNext('checkout');
      setAuth(true);
    } else navigate('checkout');
  };
  const staffView = user?.role === 'staff' && ['inbox', 'rates', 'reservations'].includes(view);
  return (
    <div className={staffView ? 'app staff-app' : 'app'}>
      <div className="announcement">
        <span>A little closer to nature. A little further from the everyday.</span>
        <span>
          CHIKKAMAGALURU, KARNATAKA <MapPin size={11} />
        </span>
      </div>
      <header className="header">
        <button className="brand" onClick={() => navigate('home')} aria-label="Mora Estate home">
          <span className="brand-mark">
            <Leaf size={25} strokeWidth={1.25} />
          </span>
          <span>
            MORA<span className="brand-small">COFFEE · COUNTRY · QUIET</span>
          </span>
        </button>
        <nav className={menu ? 'nav open' : 'nav'} aria-label="Main navigation">
          <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>
            The estate
          </button>
          <button
            className={['stays', 'detail'].includes(view) ? 'active' : ''}
            onClick={() => search()}
          >
            Our stays
          </button>
          <button
            className={view === 'enquire' ? 'active' : ''}
            onClick={() => navigate('enquire')}
          >
            Gather here
          </button>
          {user?.role === 'staff' && (
            <button className={staffView ? 'active' : ''} onClick={() => navigate('inbox')}>
              Reservations desk <span className="tiny-dot" />
            </button>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button
                className="account-link"
                onClick={() => navigate(user.role === 'staff' ? 'inbox' : 'mybookings')}
              >
                {user.name.split(' ')[0]} <ChevronDown size={13} />
              </button>
              <button
                className="icon-btn signout"
                title="Sign out"
                onClick={async () => {
                  try {
                    await post('logout', {});
                    setUser(null);
                    navigate('home');
                    notify('You have signed out.');
                  } catch (e: any) {
                    notify(e.message);
                  }
                }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button
              className="account-link"
              onClick={() => {
                setAuthNext('');
                setAuth(true);
              }}
            >
              Sign in
            </button>
          )}
          <button className="button small" onClick={() => search()}>
            Find your stay <ArrowUpRight size={15} />
          </button>
          <button
            className="icon-btn mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        {view === 'home' && (
          <>
            <section className="hero">
              <img
                className="hero-image"
                src="/images/estate.webp"
                srcSet="/images/estate-mobile.webp 700w, /images/estate.webp 1440w"
                sizes="100vw"
                alt="A secluded house surrounded by the green canopy of a forest"
                fetchPriority="high"
              />
              <div className="hero-shade" />
              <div className="hero-content">
                <div className="eyebrow light">
                  <span /> ROOTED IN COFFEE COUNTRY
                </div>
                <h1>
                  Some places ask
                  <br />
                  you to do less.
                  <br />
                  <em>This is one.</em>
                </h1>
                <p>
                  A quiet estate in the hills of Chikkamagaluru.
                  <br />
                  Come for the coffee. Stay for how it feels.
                </p>
                <button
                  className="text-link light"
                  onClick={() =>
                    document.getElementById('estate-story')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  Discover a slower way{' '}
                  <ArrowRight size={17} style={{ transform: 'rotate(90deg)' }} />
                </button>
              </div>
              <div className="hero-note">
                <span>13° 19′ N &nbsp; 75° 46′ E</span>
                <span>YOUR HILL-COUNTRY INTERLUDE</span>
              </div>
              <SearchBar stay={stay} onSearch={search} loading={loading} />
            </section>
            <section className="direct-perks">
              <span>
                <CheckCircle2 /> Best available direct rates
              </span>
              <span>
                <Coffee /> Breakfast, with our compliments
              </span>
              <span>
                <Leaf /> A stay that feels personal
              </span>
              <span className="direct-label">
                BETTER WHEN YOU BOOK DIRECT <ArrowUpRight size={13} />
              </span>
            </section>
            <section className="intro section" id="estate-story">
              <div>
                <div className="eyebrow">LEAVE THE HURRY BEHIND</div>
                <h2>
                  Wake up somewhere
                  <br />
                  <em>you can hear yourself.</em>
                </h2>
              </div>
              <div>
                <p>
                  Beyond the city, among coffee plants and old trees, life takes a gentler shape. A
                  long breakfast. A walk without a destination. One more cup, just because.
                </p>
                <p className="muted">Welcome to Mora. Make yourself at home.</p>
                <button className="text-link" onClick={() => search()}>
                  Find your corner of the estate <ArrowUpRight size={17} />
                </button>
              </div>
            </section>
            <section className="stays-section section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">THOUGHTFULLY TUCKED AWAY</div>
                  <h2>
                    Stay close. <em>Feel far away.</em>
                  </h2>
                </div>
                <button className="text-link" onClick={() => search()}>
                  Explore all stays <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="room-grid">
                {[
                  { id: 'estate', name: 'Estate Room', base: 750000 },
                  { id: 'canopy', name: 'Canopy Suite', base: 950000 },
                  { id: 'villa', name: 'Private Pool Villa', base: 1650000 },
                ].map((r, i) => (
                  <article className="room-card" key={r.id}>
                    <button
                      className="room-image"
                      onClick={() => search()}
                      aria-label={`Check availability for ${r.name}`}
                    >
                      <img
                        src={`/images/${content[r.id].image}.webp`}
                        loading="lazy"
                        alt={r.name + ' sample interior'}
                      />
                      <span className="room-number">0{i + 1}</span>
                      <span className="image-arrow">
                        <ArrowUpRight size={20} />
                      </span>
                    </button>
                    <div className="room-card-top">
                      <h3>{r.name}</h3>
                      <span>{content[r.id].size}</span>
                    </div>
                    <p>{content[r.id].tag}</p>
                    <div className="room-price">
                      From <strong>{money(r.base)}</strong>
                      <span>/ night + GST</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="sample-note">
                An imagined estate. Photographs and amenities are illustrative demo content.
              </div>
            </section>
            <section className="gather-banner">
              <Flower2 size={42} strokeWidth={1} />
              <div>
                <div className="eyebrow">GOOD THINGS HAPPEN TOGETHER</div>
                <h2>
                  A beautiful backdrop.
                  <br />
                  <em>Your kind of gathering.</em>
                </h2>
                <p>From a wedding under the open sky to a team finding fresh perspective.</p>
              </div>
              <button className="button outline" onClick={() => navigate('enquire')}>
                Plan a gathering <ArrowUpRight size={17} />
              </button>
            </section>
          </>
        )}
        {view === 'stays' && (
          <div className="page-wrap">
            <div className="breadcrumb">
              <button onClick={() => navigate('home')}>The estate</button>
              <ChevronRight size={12} /> Our stays
            </div>
            <div className="page-heading">
              <div className="eyebrow">A PLACE FOR YOUR PACE</div>
              <h1>
                Find your <em>little escape.</em>
              </h1>
              <p>Open the windows. Take your time. We’ll take care of the rest.</p>
            </div>
            <div className="search-inline">
              <SearchBar stay={stay} onSearch={search} loading={loading} />
            </div>
            <div className="results-heading">
              <span>
                {loading
                  ? 'Checking the estate…'
                  : `${rooms.filter((r) => r.available > 0).length} stays available`}
              </span>
              <span>1 room · Prices for the full stay · GST included below</span>
            </div>
            {error && <ErrorBox message={error} onRetry={() => search()} />}
            {loading ? (
              <div className="room-grid">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton room-skeleton" />
                ))}
              </div>
            ) : (
              <div className="room-grid search-results">
                {rooms.map((r) => (
                  <article
                    className={'room-card result-card ' + (!r.available ? 'sold-out' : '')}
                    key={r.id}
                  >
                    <button className="room-image" onClick={() => choose(r)}>
                      <img
                        src={`/images/${content[r.id].image}.webp`}
                        alt={r.name + ' sample interior'}
                      />
                      <span className="room-label">{content[r.id].label}</span>
                      {r.available > 0 && r.available <= 3 && (
                        <span className="limited">Only {r.available} left</span>
                      )}
                    </button>
                    <div className="result-body">
                      <div className="room-card-top">
                        <h3>{r.name}</h3>
                      </div>
                      <div className="room-meta">
                        <span>
                          <Users size={14} /> Up to {r.capacity} guests
                        </span>
                        <span>{content[r.id].size}</span>
                      </div>
                      <p>{content[r.id].description}</p>
                      <div className="amenities">
                        <span>
                          <Coffee size={14} /> Breakfast
                        </span>
                        <span>
                          <Wifi size={14} /> Wi-Fi
                        </span>
                      </div>
                      <div className="result-price">
                        <div>
                          <strong>{money(r.total)}</strong>
                          <span>
                            {money(r.subtotal)} + {money(r.tax)} GST / stay
                          </span>
                        </div>
                        <span>{r.nights.length} nights</span>
                      </div>
                      <button
                        className={'button full ' + (!r.available ? 'outline' : '')}
                        onClick={() => choose(r)}
                      >
                        {r.available ? 'Explore & book' : 'View room · unavailable'}
                        <ArrowUpRight size={16} />
                      </button>
                      {!r.available && (
                        <span className="unavailable-note">
                          {r.capacity < stay.guests
                            ? 'Choose fewer guests for this room.'
                            : 'Try different dates for this stay.'}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="reassurance">
              <ShieldCheck size={22} />
              <div>
                <strong>Direct, clear, and cared for.</strong>
                <p>
                  Your room is reserved after a successful test payment. All taxes are shown before
                  you book.
                </p>
              </div>
            </div>
          </div>
        )}
        {view === 'detail' && selected && (
          <div className="page-wrap detail-page">
            <button className="text-link back" onClick={() => navigate('stays')}>
              <ArrowLeft size={16} /> Back to stays
            </button>
            <div className="detail-image">
              <img
                src={`/images/${content[selected.id].image}.webp`}
                alt={selected.name + ' sample interior'}
              />
              <span className="photo-note">Illustrative photograph</span>
            </div>
            <div className="detail-layout">
              <div>
                <div className="eyebrow">{content[selected.id].label}</div>
                <h1>{selected.name}</h1>
                <div className="room-meta">
                  <span>
                    <Users size={16} /> Up to {selected.capacity} guests
                  </span>
                  <span>{content[selected.id].size}</span>
                  <span>Estate views</span>
                </div>
                <p className="detail-description">{content[selected.id].description}</p>
                <h3>Small comforts. Thoughtfully considered.</h3>
                <div className="feature-grid">
                  {content[selected.id].features.map((f: string) => (
                    <span key={f}>
                      <Check size={17} />
                      {f}
                    </span>
                  ))}
                </div>
                <div className="policy">
                  <h3>A few things before you arrive</h3>
                  <p>
                    Demo policy: check-in from 2 pm, check-out by 11 am. One room per booking, up to
                    14 nights. Children count towards capacity. Breakfast is included; no
                    extra-person fees in this demo.
                  </p>
                  <p>
                    No real money is collected. Contact reservations for changes; self-service
                    cancellation is outside this build.
                  </p>
                </div>
              </div>
              <aside className="booking-summary">
                <div className="eyebrow">YOUR TIME IN THE HILLS</div>
                <div className="summary-dates">
                  <div>
                    <span>CHECK-IN</span>
                    <strong>{human(stay.arrival)}</strong>
                  </div>
                  <ArrowRight size={17} />
                  <div>
                    <span>CHECK-OUT</span>
                    <strong>{human(stay.departure)}</strong>
                  </div>
                </div>
                <p>
                  {stay.guests} guests · 1 room · {selected.nights.length} nights
                </p>
                <PriceLines room={selected} />
                <button className="button full" disabled={!selected.available} onClick={checkout}>
                  {selected.available ? 'Reserve your stay' : 'Unavailable for these dates'}
                  <ArrowRight size={17} />
                </button>
                <button className="text-link centered" onClick={() => search()}>
                  Change dates
                </button>
                <span className="secure-note">
                  <ShieldCheck size={14} /> Test checkout · no real charge
                </span>
              </aside>
            </div>
          </div>
        )}
        {view === 'checkout' && selected && (
          <Checkout
            user={user}
            room={selected}
            stay={stay}
            onBack={() => navigate('detail')}
            onComplete={(b: any) => {
              setConfirmation(b);
              navigate('confirmed');
            }}
            onRefresh={() => search()}
          />
        )}
        {view === 'confirmed' && confirmation && (
          <div className="confirmation">
            <div className="confirmation-mark">
              <Check size={32} />
            </div>
            <div className="eyebrow">THE HILLS ARE CALLING</div>
            <h1>
              Your quiet corner
              <br />
              <em>is waiting.</em>
            </h1>
            <p>Your test booking is confirmed. No real payment was collected.</p>
            <div className="confirmation-card">
              <div>
                <span>BOOKING REFERENCE</span>
                <strong>{confirmation.id}</strong>
              </div>
              <hr />
              <h3>{selected?.name}</h3>
              <p>
                {human(confirmation.arrival)} — {human(confirmation.departure)}
              </p>
              <p>
                {confirmation.guests} guests · Total in test mode:{' '}
                <strong>{money(confirmation.total)}</strong>
              </p>
              <div className="badge green">
                <Check size={13} /> Confirmed · test payment
              </div>
            </div>
            <p className="muted">Saved in your account. No email is sent in this demo.</p>
            <div className="button-row">
              <button className="button" onClick={() => navigate('mybookings')}>
                My bookings <ArrowRight size={16} />
              </button>
              <button className="button outline" onClick={() => window.print()}>
                Print confirmation
              </button>
            </div>
          </div>
        )}
        {view === 'mybookings' && <Bookings staff={false} onExplore={() => search()} />}
        {view === 'enquire' && <EnquiryForm user={user} notify={notify} />}
        {staffView && (
          <div className="desk-layout">
            <aside className="desk-sidebar">
              <div className="eyebrow">THE RESERVATIONS DESK</div>
              <h2>
                A little more
                <br />
                <em>hospitality.</em>
              </h2>
              <div className="staff-profile">
                <span className="avatar">{user.name.charAt(0)}</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>Reservations staff</small>
                </div>
                <span className="online-dot" />
              </div>
              <nav aria-label="Staff navigation">
                {[
                  ['inbox', 'Enquiry inbox', Inbox],
                  ['rates', 'Rates & allotment', SlidersHorizontal],
                  ['reservations', 'Bookings', BedDouble],
                ].map(([id, label, Icon]: any) => (
                  <button
                    key={id}
                    className={view === id ? 'selected' : ''}
                    onClick={() => navigate(id)}
                  >
                    <Icon size={18} />
                    {label}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </nav>
              <div className="desk-help">
                <ShieldCheck size={20} />
                <strong>Website stock only</strong>
                <p>
                  Allotments are separate from agency inventory. Every night is checked before
                  confirmation.
                </p>
              </div>
              <button className="text-link" onClick={() => navigate('home')}>
                <ArrowUpRight size={15} /> View guest website
              </button>
            </aside>
            <section className="desk-main">
              {view === 'inbox' ? (
                <InboxView notify={notify} />
              ) : view === 'rates' ? (
                <Rates notify={notify} />
              ) : (
                <Bookings staff onExplore={() => search()} />
              )}
            </section>
          </div>
        )}
        {view === 'privacy' && (
          <div className="page-wrap privacy">
            <div className="eyebrow">YOUR STAY. YOUR PRIVACY.</div>
            <h1>A little care with your details.</h1>
            <p>
              This is an evaluation demo. Use fictional names and test email addresses. Do not
              submit real personal or payment data.
            </p>
            <p>
              We store accounts, bookings and enquiries in the application database. Passwords are
              salted and hashed; session cookies expire in 24 hours. Reservations staff can see
              enquiries and bookings. No passport or card details are collected.
            </p>
            <p>
              Enquiry classification runs in the application. Text is not sent to an external AI
              provider. Before a real launch, the resort must configure its privacy contact,
              retention policy and deletion process.
            </p>
            <button className="button" onClick={() => navigate('home')}>
              Back to the estate
            </button>
          </div>
        )}
      </main>
      {!staffView && (
        <footer>
          <div className="footer-main">
            <div>
              <div className="brand footer-brand">
                <Leaf size={25} strokeWidth={1.2} />
                <span>
                  MORA<span className="brand-small">COFFEE · COUNTRY · QUIET</span>
                </span>
              </div>
              <p>
                Somewhere to slow down.
                <br />
                Chikkamagaluru, Karnataka.
              </p>
            </div>
            <div>
              <span className="eyebrow">MAKE YOURSELF AT HOME</span>
              <button onClick={() => search()}>
                Find your stay <ArrowUpRight size={14} />
              </button>
              <button onClick={() => navigate('enquire')}>
                Weddings & offsites <ArrowUpRight size={14} />
              </button>
              <button
                onClick={() => {
                  setAuthNext('inbox');
                  setAuth(true);
                }}
              >
                Staff sign in <ArrowUpRight size={14} />
              </button>
              <button
                onClick={async () => {
                  if (user) {
                    try {
                      await post('logout', {});
                      setUser(null);
                      navigate('home');
                    } catch (e: any) {
                      notify(e.message);
                    }
                  } else {
                    setAuthNext('');
                    setAuth(true);
                  }
                }}
              >
                {user ? 'Sign out' : 'Guest sign in'} <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="footer-message">
              <span className="eyebrow">A NOTE FROM THE ESTATE</span>
              <h3>
                The best plans
                <br />
                <em>leave room for nothing.</em>
              </h3>
              <span>We’ll put the coffee on.</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Mora Estate · Illustrative resort demo</span>
            <span>Test payments · Synthetic data · No real messages sent</span>
            <button onClick={() => navigate('privacy')}>Privacy</button>
          </div>
        </footer>
      )}
      {auth && (
        <AuthModal
          onClose={() => setAuth(false)}
          onSuccess={(u: any) => {
            setUser(u);
            setAuth(false);
            if (authNext === 'inbox' && u.role !== 'staff') {
              notify('Use the staff demo account for the reservations desk.');
              return;
            }
            if (authNext) setView(authNext);
            notify(`Welcome, ${u.name.split(' ')[0]}.`);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
