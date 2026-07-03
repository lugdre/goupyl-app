import { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { userApi } from '../../services/user.api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import { MapPin, Search } from 'lucide-react';
import { CATEGORY_LABELS, COURSE_LOCATION_OPTIONS } from '../../utils/constants';
import PublicNavbar from '../../components/layout/PublicNavbar';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';

const CATEGORIES = ['Tous', 'SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'];

const SI_CSS = `
  :root{
    --bg:#f4f4f2;--bg-soft:#ebebe7;--bg-dark:#0a0a0a;
    --ink:#0a0a0a;--ink-2:#2a2a2a;--ink-3:#555;--ink-4:#888;
    --line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.06);
    --accent:#252d62;--on-accent:#fff;
  }
  *{box-sizing:border-box}
  .si-eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
  .si-display{font-family:"Archivo Narrow","Archivo",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.015em;line-height:.95;margin:0}
  .si-lede{color:var(--ink-2);font-size:16px;max-width:600px;margin:0}
  .si-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 22px;font-family:"Inter Tight",sans-serif;font-weight:600;font-size:13.5px;letter-spacing:.02em;border-radius:999px;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s ease,background .2s ease,color .2s ease,border-color .2s ease;white-space:nowrap;background:transparent}
  .si-btn:hover{transform:translateY(-1px)}
  .si-btn-primary{background:var(--ink);color:var(--bg)}
  .si-btn-primary:hover{background:var(--ink-2)}
  .si-btn-ghost{background:transparent;color:var(--ink);border-color:var(--line)}
  .si-btn-ghost:hover{border-color:var(--ink)}
  .si-btn-sm{height:36px;padding:0 16px;font-size:12.5px}
  .si-btn-lg{height:52px;padding:0 28px;font-size:14.5px}
  .si-btn-on-dark{background:#fff;color:#000;border-color:transparent}
  .si-btn-active{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .si-searchbar{background:#fff;border:1px solid var(--line);display:flex;gap:4px;padding:6px;max-width:680px;align-items:center}
  .si-searchbar input{border:none;outline:none;background:transparent;font-family:"Inter Tight",sans-serif;font-size:14px;padding:8px 12px;color:var(--ink);flex:1}
  .si-searchbar input::placeholder{color:var(--ink-4)}
  .si-searchbar-sep{width:1px;background:var(--line);margin:4px 0;align-self:stretch}
  .si-count{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 18px}
  .si-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
  @media(max-width:980px){.si-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:640px){.si-grid{grid-template-columns:1fr}}
  .si-card{background:var(--bg);padding:24px;display:flex;gap:16px;align-items:flex-start;text-decoration:none;color:inherit;transition:background .2s}
  .si-card:hover{background:var(--bg-soft)}
  .si-card-avatar{width:56px;height:56px;border-radius:50%;background:var(--bg-soft);border:1px solid var(--line);flex-shrink:0;overflow:hidden}
  .si-card-avatar img{width:100%;height:100%;object-fit:cover;filter:grayscale(30%)}
  .si-card-name{font-weight:600;font-size:14.5px;color:var(--ink)}
  .si-card-role{font-size:12px;color:var(--ink-3);margin-top:2px}
  .si-card-stats{margin-top:10px;display:flex;gap:14px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3)}
  .si-card-stats strong{color:var(--ink);font-weight:600}
  .si-card-pill{display:inline-block;padding:3px 8px;font-size:10.5px;border:1px solid var(--line);margin-top:10px;font-family:"JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
  .si-banner{background:var(--ink);color:var(--bg);padding:48px;display:grid;grid-template-columns:1.5fr auto;gap:32px;align-items:center;border:1px solid var(--ink)}
  .si-banner h3{margin:0;font-size:36px;font-family:"Archivo Narrow",sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:-.01em}
  .si-banner p{margin:8px 0 0;color:#bbb;font-size:14.5px;max-width:520px}
  .si-empty{padding:80px 32px;text-align:center;border:1px solid var(--line);background:var(--bg)}
  .si-empty-text{font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0}
  .si-spinner{width:36px;height:36px;border:1.5px solid var(--line);border-top-color:var(--ink);border-radius:50%;animation:si-spin 0.8s linear infinite}
  @keyframes si-spin{to{transform:rotate(360deg)}}
  @media(max-width:640px){.si-banner{grid-template-columns:1fr;gap:20px}}
`;

export default function SearchIntervenants() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [intervenants, setIntervenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [courseLocation, setCourseLocation] = useState(searchParams.get('lieu') || '');
  const [maxRate, setMaxRate] = useState(searchParams.get('maxRate') || '');
  const [activeCategory, setActiveCategory] = useState(
    CATEGORIES.includes(searchParams.get('category')) ? searchParams.get('category') : 'Tous'
  );

  const isInDashboard = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Archivo+Narrow:wght@700;800&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const fetchIntervenants = () => {
    setLoading(true);
    userApi
      .getIntervenants({
        ...(city && { city }),
        ...(courseLocation && { courseLocation }),
        ...(maxRate && { maxRate }),
      })
      .then(({ data }) => setIntervenants(data.intervenants))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  // Refetch immédiat quand le lieu change (filtre serveur) ; la ville et le
  // tarif max s'appliquent au submit du formulaire de recherche.
  useEffect(fetchIntervenants, [courseLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const advancedFilters = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
      <select
        value={courseLocation}
        onChange={(e) => setCourseLocation(e.target.value)}
        style={{
          height: 38, padding: '0 12px', borderRadius: 4, fontSize: 13,
          border: '1px solid rgba(0,0,0,0.14)', background: '#fff', color: courseLocation ? '#0a0a0a' : '#888',
          fontFamily: '"Inter Tight", sans-serif', cursor: 'pointer', outline: 'none',
        }}
      >
        <option value="">Lieu de séance — Tous</option>
        {COURSE_LOCATION_OPTIONS.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number"
          min="0"
          placeholder="Tarif max"
          value={maxRate}
          onChange={(e) => setMaxRate(e.target.value)}
          onBlur={fetchIntervenants}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchIntervenants(); } }}
          style={{
            height: 38, width: 100, padding: '0 12px', borderRadius: 4, fontSize: 13,
            border: '1px solid rgba(0,0,0,0.14)', background: '#fff', color: '#0a0a0a',
            fontFamily: '"Inter Tight", sans-serif', outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: '#888', fontFamily: '"JetBrains Mono", monospace' }}>€/h</span>
      </div>
    </div>
  );

  const filtered = intervenants.filter((i) => {
    const q = query.toLowerCase();
    const name = `${i.firstName} ${i.lastName}`.toLowerCase();
    const specialties = (i.profile?.specialties || []).join(' ').toLowerCase();
    const bio = (i.profile?.bio || '').toLowerCase();
    const matchQuery = !q || name.includes(q) || specialties.includes(q) || bio.includes(q);
    const matchCat = activeCategory === 'Tous' || i.profile?.specialties?.some(
      (s) => s.toUpperCase().includes(activeCategory)
    );
    return matchQuery && matchCat;
  });

  // ── Dashboard (authenticated) ──────────────────────────────────────
  const dashboardContent = (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 'clamp(28px,3.5vw,48px)', color: '#0a0a0a' }}>Nos professionnels</h1>
        <p style={{ color: '#555', fontSize: 14, marginTop: 6 }}>
          Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchIntervenants(); }} className="si-searchbar" style={{ marginBottom: 20 }}>
        <Search size={16} style={{ color: '#888', flexShrink: 0, marginLeft: 8 }} />
        <input type="text" placeholder="Nom, spécialité, sport..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="si-searchbar-sep" />
        <MapPin size={16} style={{ color: '#888', flexShrink: 0 }} />
        <input type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: 90 }} />
        <button type="submit" className="si-btn si-btn-primary si-btn-sm" style={{ borderRadius: 4 }}>Rechercher</button>
      </form>

      {advancedFilters}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`si-btn si-btn-sm ${active ? 'si-btn-active' : 'si-btn-ghost'}`}>
              {cat === 'Tous' ? 'Tous' : CATEGORY_LABELS?.[cat] || cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="si-empty">
          <p className="si-empty-text">// Aucun professionnel trouvé</p>
          <p className="si-empty-text" style={{ color: '#888', marginTop: 10 }}>Essayez de modifier vos critères</p>
        </div>
      ) : (
        <>
          <p className="si-count">{String(filtered.length).padStart(2, '0')} professionnel{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</p>
          <div className="si-grid">
            {filtered.map((intervenant) => {
              const specialty = intervenant.profile?.specialties?.[0]
                ? CATEGORY_LABELS[intervenant.profile.specialties[0]] || intervenant.profile.specialties[0]
                : null;
              const avatarSrc = intervenant.avatarUrl || (intervenant.gender === 'FEMME' ? avatarFemale : avatarMale);
              return (
                <Link key={intervenant.id} to={`/coaches/${intervenant.id}`} className="si-card">
                  <div className="si-card-avatar"><img src={avatarSrc} alt={intervenant.firstName} /></div>
                  <div>
                    <div className="si-card-name">{intervenant.firstName} {intervenant.lastName}</div>
                    {specialty && <div className="si-card-role">{specialty}</div>}
                    {intervenant.profile?.city && (
                      <div className="si-card-role" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <MapPin size={11} /> {intervenant.profile.city}
                      </div>
                    )}
                    <div className="si-card-stats">
                      {intervenant.averageRating != null && <span><strong>★ {Number(intervenant.averageRating).toFixed(1)}</strong></span>}
                      {intervenant.reviewCount > 0 && <span><strong>{intervenant.reviewCount}</strong> avis</span>}
                      {intervenant.sessionsDone > 0 && <span><strong>{intervenant.sessionsDone}</strong> séances</span>}
                      {!intervenant.averageRating && !intervenant.sessionsDone && <span>Nouveau</span>}
                    </div>
                    {specialty && <div className="si-card-pill">{specialty}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );

  // ── Dashboard (inside DashboardLayout) ───────────────────────────────
  if (isInDashboard) {
    return (
      <>
        <style>{SI_CSS}</style>
        <div className="max-w-5xl">{dashboardContent}</div>
      </>
    );
  }

  // ── Public page wrapper for /search (authenticated or not) ────────────
  const results = (
    <>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '96px 0' }}>
          <div className="si-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="si-empty">
          <p className="si-empty-text">// Aucun professionnel trouvé</p>
          <p className="si-empty-text" style={{ color: 'var(--ink-4)', marginTop: 10 }}>
            Essayez de modifier vos critères de recherche
          </p>
        </div>
      ) : (
        <>
          <p className="si-count">
            {String(filtered.length).padStart(2, '0')} professionnel{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
          <div className="si-grid">
            {filtered.map((intervenant) => {
              const specialty = intervenant.profile?.specialties?.[0]
                ? CATEGORY_LABELS[intervenant.profile.specialties[0]] || intervenant.profile.specialties[0]
                : null;
              const avatarSrc = intervenant.avatarUrl || (intervenant.gender === 'FEMME' ? avatarFemale : avatarMale);
              return (
                <Link key={intervenant.id} to={`/coaches/${intervenant.id}`} className="si-card">
                  <div className="si-card-avatar">
                    <img src={avatarSrc} alt={intervenant.firstName} />
                  </div>
                  <div>
                    <div className="si-card-name">{intervenant.firstName} {intervenant.lastName}</div>
                    {specialty && <div className="si-card-role">{specialty}</div>}
                    {intervenant.profile?.city && (
                      <div className="si-card-role" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <MapPin size={11} /> {intervenant.profile.city}
                      </div>
                    )}
                    <div className="si-card-stats">
                      {intervenant.averageRating != null && (
                        <span><strong>★ {Number(intervenant.averageRating).toFixed(1)}</strong></span>
                      )}
                      {intervenant.reviewCount > 0 && (
                        <span><strong>{intervenant.reviewCount}</strong> avis</span>
                      )}
                      {intervenant.sessionsDone > 0 && (
                        <span><strong>{intervenant.sessionsDone}</strong> séances</span>
                      )}
                      {!intervenant.averageRating && !intervenant.sessionsDone && (
                        <span>Nouveau</span>
                      )}
                    </div>
                    {specialty && <div className="si-card-pill">{specialty}</div>}
                  </div>
                </Link>
              );
            })}
          </div>

          {!user && (
            <div className="si-banner" style={{ marginTop: 48 }}>
              <div>
                <h3>Réservez votre séance.</h3>
                <p>Prenez rendez-vous en 60 secondes avec le pro qui correspond à votre objectif. Sans abonnement — à partir de 40€.</p>
              </div>
              <Link to="/register?role=CLIENT" className="si-btn si-btn-on-dark si-btn-lg">
                Créer un compte →
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f4f2',
      color: '#0a0a0a',
      fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
    }}>
      <style>{SI_CSS}</style>
      <PublicNavbar transparent={false} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
        {/* Back to home — unauthenticated only */}
        {!user && (
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            letterSpacing: '.14em', textTransform: 'uppercase',
            color: '#555', textDecoration: 'none', marginBottom: 20,
            marginTop: 20,
          }}>
            ← Retour
          </Link>
        )}

        {/* Hero — only for unauthenticated */}
        {!user ? (
          <div style={{ marginBottom: 48 }}>
            <p className="si-eyebrow" style={{ marginBottom: 16 }}></p>
            <h1 className="si-display" style={{ fontSize: 'clamp(48px,7vw,96px)', marginBottom: 20 }}>
              Trouvez votre<br />expert.
            </h1>
            <p className="si-lede" style={{ marginBottom: 32 }}>
              Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être — sélectionnés et certifiés.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); fetchIntervenants(); }} className="si-searchbar">
              <Search size={16} style={{ color: 'var(--ink-4)', flexShrink: 0, marginLeft: 8 }} />
              <input type="text" placeholder="Sport, nutrition, yoga..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="si-searchbar-sep" />
              <MapPin size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
              <input type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: 90 }} />
              <button type="submit" className="si-btn si-btn-primary si-btn-sm" style={{ borderRadius: 4 }}>Rechercher</button>
            </form>
            <div style={{ marginTop: 16 }}>{advancedFilters}</div>
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <h1 className="si-display" style={{ fontSize: 'clamp(28px,3.5vw,48px)', marginBottom: 8 }}>Nos professionnels</h1>
            <p style={{ color: '#555', fontSize: 14, marginTop: 6, marginBottom: 20 }}>
              Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); fetchIntervenants(); }} className="si-searchbar" style={{ marginBottom: 20 }}>
              <Search size={16} style={{ color: '#888', flexShrink: 0, marginLeft: 8 }} />
              <input type="text" placeholder="Nom, spécialité, sport..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="si-searchbar-sep" />
              <MapPin size={16} style={{ color: '#888', flexShrink: 0 }} />
              <input type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: 90 }} />
              <button type="submit" className="si-btn si-btn-primary si-btn-sm" style={{ borderRadius: 4 }}>Rechercher</button>
            </form>
            {advancedFilters}
          </div>
        )}

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`si-btn si-btn-sm ${active ? 'si-btn-active' : 'si-btn-ghost'}`}>
                {cat === 'Tous' ? 'Tous' : CATEGORY_LABELS?.[cat] || cat}
              </button>
            );
          })}
        </div>

        {results}
      </div>
    </div>
  );
}
