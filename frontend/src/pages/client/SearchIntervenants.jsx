import { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { userApi } from '../../services/user.api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import { MapPin, Search } from 'lucide-react';
import { CATEGORY_LABELS, COURSE_LOCATION_OPTIONS } from '../../utils/constants';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';
import logo from '../../assets/logo-goupyl-white.png';
import expertCoach from '../../assets/expert-coach.jpg';

const CATEGORIES = ['Tous', 'SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'];

// Nombre de coachs affichés avant le bouton « Voir plus »
const INITIAL_VISIBLE = 15;

const ArrowUpRight = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);

// IMAGE — bandeau du haut de page. Remplacez PLACEHOLDER_DARK dans le
// <img className="sp-hero-img"> par le chemin de votre photo,
// par exemple  src="/images/search.jpg"  (fichier dans frontend/public/images/).
const PLACEHOLDER_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='700'%3E%3Crect width='1600' height='700' fill='%236d6b66'/%3E%3Cg stroke='%23d8d6d1' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='752' y='312' width='96' height='76' rx='10'/%3E%3Ccircle cx='780' cy='340' r='9'/%3E%3Cpath d='M848 372l-34-30-62 46'/%3E%3C/g%3E%3C/svg%3E";

const SI_CSS = `
  .sp{--bg:#EBEAE6;--card:#FFFFFF;--ink:#171614;--ink-2:#4c4a46;--ink-3:#8a8781;--line:#E4E2DC;--orange:#F4530F;min-height:100vh;background:var(--bg);padding:20px;font-family:"Inter",system-ui,-apple-system,sans-serif;color:var(--ink);display:flex;flex-direction:column;gap:14px;-webkit-font-smoothing:antialiased}
  .sp *,.si-scope *{box-sizing:border-box}
  .sp-hero{position:relative;border-radius:22px;overflow:hidden;padding:26px 40px 52px;background:linear-gradient(150deg,#9a9892 0%,#6d6b66 55%,#55534f 100%);color:#fff}
  .sp-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .sp-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,.30) 0%,rgba(15,15,15,.55) 100%);pointer-events:none}
  .sp-nav{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
  .sp-nav-links{display:flex;gap:30px;font-size:15px;font-weight:500}
  .sp-nav-links a{color:#fff;text-decoration:none;opacity:.95}
  .sp-nav-links a:hover{opacity:.7}
  .sp-logo{position:absolute;left:50%;transform:translateX(-50%)}
  .sp-cta{display:inline-flex;align-items:center;gap:12px;border-radius:999px;padding:6px 6px 6px 22px;font-size:15px;font-weight:500;background:#fff;color:var(--ink);text-decoration:none;transition:transform .15s ease;white-space:nowrap}
  .sp-cta:hover{transform:translateY(-1px)}
  .sp-cta-circle{width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,#FF7A33,#F4530F);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .sp-hero-body{position:relative;z-index:1;margin-top:52px;max-width:820px}
  .sp-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;color:#fff}
  .sp-chip i{width:5px;height:5px;border-radius:50%;background:var(--orange);font-style:normal}
  .sp-title{font-size:clamp(44px,5.4vw,84px);font-weight:700;letter-spacing:-.025em;line-height:.98;margin:18px 0 0}
  .sp-title--sm{font-size:clamp(34px,3.6vw,52px)}
  .sp-title em{font-style:italic;color:#FF9C6B;font-weight:500}
  .sp-lede{margin-top:18px;font-size:15.5px;line-height:1.55;color:rgba(255,255,255,.88);max-width:520px}
  .sp-results{background:var(--card);border-radius:22px;padding:44px 40px 64px}
  @media(max-width:640px){.sp{padding:10px}.sp-hero{padding:20px 20px 36px}.sp-nav-links{display:none}.sp-logo{position:static;transform:none}.sp-results{padding:32px 20px 48px}}

  .si-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 22px;font-family:inherit;font-weight:500;font-size:13.5px;border-radius:999px;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s ease,background .2s ease,color .2s ease,border-color .2s ease;white-space:nowrap;background:transparent}
  .si-btn:hover{transform:translateY(-1px)}
  .si-btn-primary{background:var(--orange, #F4530F);color:#fff;font-weight:600}
  .si-btn-ghost{background:#fff;color:var(--ink-2, #4c4a46);border-color:var(--line, #E4E2DC)}
  .si-btn-ghost:hover{border-color:#c9c7c1;color:var(--ink, #171614)}
  .si-btn-sm{height:38px;padding:0 18px;font-size:13px}
  .si-btn-lg{height:52px;padding:0 26px;font-size:14.5px}
  .si-btn-active{background:var(--orange, #F4530F);color:#fff;border-color:var(--orange, #F4530F);font-weight:600}
  .si-searchbar{background:#fff;border:1px solid var(--line, #E4E2DC);border-radius:999px;display:flex;gap:4px;padding:6px;max-width:680px;align-items:center}
  .si-searchbar input{border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;padding:8px 12px;color:var(--ink, #171614);flex:1;min-width:0}
  .si-searchbar input::placeholder{color:var(--ink-3, #8a8781)}
  .si-searchbar-sep{width:1px;background:var(--line, #E4E2DC);margin:4px 0;align-self:stretch}
  .si-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .si-select{height:40px;padding:0 16px;border-radius:999px;font-size:13px;border:1px solid var(--line, #E4E2DC);background:#fff;color:var(--ink-2, #4c4a46);font-family:inherit;cursor:pointer;outline:none}
  .si-rate{height:40px;width:110px;padding:0 16px;border-radius:999px;font-size:13px;border:1px solid var(--line, #E4E2DC);background:#fff;color:var(--ink, #171614);font-family:inherit;outline:none}
  .si-rate::placeholder{color:var(--ink-3, #8a8781)}
  .si-rate-unit{font-size:12.5px;font-weight:500;color:var(--ink-3, #8a8781)}
  .sp-hero .si-rate-unit{color:rgba(255,255,255,.85)}
  .si-count{font-size:12.5px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3, #8a8781);margin:0 0 18px}
  .si-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  @media(max-width:980px){.si-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:640px){.si-grid{grid-template-columns:1fr}}
  .si-card{background:#fff;border:1px solid var(--line, #E4E2DC);border-radius:16px;padding:22px;display:flex;gap:14px;align-items:flex-start;text-decoration:none;color:inherit;transition:border-color .2s,transform .15s ease,box-shadow .2s}
  .si-card:hover{border-color:#c9c7c1;transform:translateY(-2px);box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .si-card-avatar{width:56px;height:56px;border-radius:50%;background:#EFEDE8;border:1px solid var(--line, #E4E2DC);flex-shrink:0;overflow:hidden}
  .si-card-avatar img{width:100%;height:100%;object-fit:cover}
  .si-card-name{font-weight:600;font-size:15px;color:var(--ink, #171614)}
  .si-card-role{font-size:12.5px;color:var(--ink-3, #8a8781);margin-top:2px}
  .si-card-stats{margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-3, #8a8781)}
  .si-card-stats strong{color:var(--ink, #171614);font-weight:600}
  .si-card-pill{display:inline-block;padding:4px 12px;font-size:11.5px;font-weight:500;border:1px solid var(--line, #E4E2DC);border-radius:999px;margin-top:12px;color:var(--ink-2, #4c4a46)}
  .si-banner{background:#191917;color:#fff;padding:44px 48px;display:grid;grid-template-columns:1.5fr auto;gap:32px;align-items:center;border-radius:20px}
  .si-banner h3{margin:0;font-size:32px;font-weight:600;letter-spacing:-.025em}
  .si-banner p{margin:10px 0 0;color:rgba(255,255,255,.75);font-size:14.5px;line-height:1.55;max-width:520px}
  .si-banner-cta{display:inline-flex;align-items:center;gap:12px;border-radius:999px;padding:6px 6px 6px 22px;font-size:15px;font-weight:600;background:var(--orange, #F4530F);color:#fff;text-decoration:none;transition:transform .15s ease;white-space:nowrap}
  .si-banner-cta:hover{transform:translateY(-1px)}
  .si-banner-cta span{width:36px;height:36px;border-radius:50%;background:#fff;color:var(--orange, #F4530F);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .si-empty{padding:80px 32px;text-align:center;border:1px dashed var(--line, #E4E2DC);border-radius:16px;background:transparent}
  .si-empty-text{font-size:13.5px;font-weight:500;color:var(--ink-3, #8a8781);margin:0}
  .si-spinner{width:36px;height:36px;border:2px solid var(--line, #E4E2DC);border-top-color:var(--orange, #F4530F);border-radius:50%;animation:si-spin 0.8s linear infinite}
  @keyframes si-spin{to{transform:rotate(360deg)}}
  @media(max-width:640px){.si-banner{grid-template-columns:1fr;gap:20px;padding:32px 24px}}
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
  const [showAll, setShowAll] = useState(false);

  const isInDashboard = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const fetchIntervenants = () => {
    setLoading(true);
    setShowAll(false);
    userApi
      .getIntervenants({
        // On charge tout le catalogue : l'affichage est limité à 15 + « Voir plus »
        limit: 200,
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
  useEffect(fetchIntervenants, [courseLocation]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const advancedFilters = (
    <div className="si-filters" style={{ marginBottom: 20 }}>
      <select
        value={courseLocation}
        onChange={(e) => setCourseLocation(e.target.value)}
        className="si-select"
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
          className="si-rate"
        />
        <span className="si-rate-unit">€/h</span>
      </div>
    </div>
  );

  // Repli sur les 15 premiers quand la recherche texte / catégorie change
  useEffect(() => {
    setShowAll(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [query, activeCategory]);

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

  // 15 premiers résultats, le reste derrière « Voir plus »
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  const showMoreButton = hiddenCount > 0 && (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
      <button type="button" onClick={() => setShowAll(true)} className="si-btn si-btn-ghost">
        Voir plus ({hiddenCount} autre{hiddenCount > 1 ? 's' : ''})
      </button>
    </div>
  );

  const coachCards = (
    <div className="si-grid">
      {visible.map((intervenant) => {
        const specialty = intervenant.profile?.specialties?.[0]
          ? CATEGORY_LABELS[intervenant.profile.specialties[0]] || intervenant.profile.specialties[0]
          : null;
        const avatarSrc = intervenant.avatarUrl || (intervenant.gender === 'FEMME' ? avatarFemale : avatarMale);
        return (
          <Link key={intervenant.id} to={`/coaches/${intervenant.id}`} className="si-card">
            <div className="si-card-avatar">
              <img src={avatarSrc} alt={intervenant.firstName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = intervenant.gender === 'FEMME' ? avatarFemale : avatarMale; }} />
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
  );

  const categoryPills = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
      {CATEGORIES.map((cat) => {
        const active = activeCategory === cat;
        return (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`si-btn si-btn-sm ${active ? 'si-btn-active' : 'si-btn-ghost'}`}>
            {cat === 'Tous' ? 'Tous' : CATEGORY_LABELS?.[cat] || cat}
          </button>
        );
      })}
    </div>
  );

  // ── Dashboard (authenticated) ──────────────────────────────────────
  const dashboardContent = (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 'clamp(28px,3.5vw,48px)', color: 'var(--color-gray-900)' }}>Nos professionnels</h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: 14, marginTop: 6 }}>
          Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchIntervenants(); }} className="si-searchbar" style={{ marginBottom: 20 }}>
        <Search size={16} style={{ color: '#8a8781', flexShrink: 0, marginLeft: 8 }} />
        <input type="text" placeholder="Nom, spécialité, sport..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="si-searchbar-sep" />
        <MapPin size={16} style={{ color: '#8a8781', flexShrink: 0 }} />
        <input type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: 90 }} />
        <button type="submit" className="si-btn si-btn-primary si-btn-sm">Rechercher</button>
      </form>

      {advancedFilters}

      {categoryPills}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="si-empty">
          <p className="si-empty-text">Aucun professionnel trouvé</p>
          <p className="si-empty-text" style={{ marginTop: 10 }}>Essayez de modifier vos critères</p>
        </div>
      ) : (
        <>
          <p className="si-count">{String(filtered.length).padStart(2, '0')} professionnel{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</p>
          {coachCards}
          {showMoreButton}
        </>
      )}
    </>
  );

  // ── Dashboard (inside DashboardLayout) ───────────────────────────────
  if (isInDashboard) {
    return (
      <>
        <style>{SI_CSS}</style>
        <div className="max-w-5xl si-scope">{dashboardContent}</div>
      </>
    );
  }

  // ── Public page /search — design landing ─────────────────────────────
  return (
    <div className="sp">
      <style>{SI_CSS}</style>

      {/* Hero — carte sombre façon landing */}
      <section className="sp-hero">
        {/* IMAGE — bandeau du haut de page */}
        <img className="sp-hero-img" src={expertCoach} alt="" />

        <header className="sp-nav">
          <nav className="sp-nav-links">
            <Link to="/">Accueil</Link>
            <Link to="/#domaines">Domaines</Link>
            <Link to="/#coaches">Coachs</Link>
            <Link to="/#pricing">Tarifs</Link>
          </nav>
          <div className="sp-logo">
            <Link to="/"><img src={logo} alt="Goupyl Sport" style={{ height: 44, width: 'auto', display: 'block' }} /></Link>
          </div>
          {user ? (
            <Link to="/dashboard" className="sp-cta">
              Mon espace
              <span className="sp-cta-circle"><ArrowUpRight color="#fff" /></span>
            </Link>
          ) : (
            <Link to="/login" className="sp-cta">
              Commencer
              <span className="sp-cta-circle"><ArrowUpRight color="#fff" /></span>
            </Link>
          )}
        </header>

        <div className="sp-hero-body">
          <span className="sp-chip"><i />Trouver un coach</span>
          <h1 className={`sp-title${user ? ' sp-title--sm' : ''}`}>
            {user ? <>Nos Professionnels</> : <>Trouvez Votre<br /><em>Expert.</em></>}
          </h1>
          <p className="sp-lede">
            Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être — sélectionnés et certifiés.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); fetchIntervenants(); }} className="si-searchbar" style={{ marginTop: 28 }}>
            <Search size={16} style={{ color: '#8a8781', flexShrink: 0, marginLeft: 8 }} />
            <input type="text" placeholder="Sport, nutrition, yoga..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="si-searchbar-sep" />
            <MapPin size={16} style={{ color: '#8a8781', flexShrink: 0 }} />
            <input type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: 90 }} />
            <button type="submit" className="si-btn si-btn-primary si-btn-sm">Rechercher</button>
          </form>

          <div style={{ marginTop: 14 }}>{advancedFilters}</div>
        </div>
      </section>

      {/* Résultats — carte blanche */}
      <section className="sp-results">
        {categoryPills}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '96px 0' }}>
            <div className="si-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="si-empty">
            <p className="si-empty-text">Aucun professionnel trouvé</p>
            <p className="si-empty-text" style={{ marginTop: 10 }}>
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          <>
            <p className="si-count">
              {String(filtered.length).padStart(2, '0')} professionnel{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
            </p>
            {coachCards}
            {showMoreButton}

            {!user && (
              <div className="si-banner" style={{ marginTop: 48 }}>
                <div>
                  <h3>Réservez votre séance.</h3>
                  <p>Prenez rendez-vous en 60 secondes avec le pro qui correspond à votre objectif. Sans abonnement — à partir de 40 €.</p>
                </div>
                <Link to="/register?role=CLIENT" className="si-banner-cta">
                  Créer un compte
                  <span><ArrowUpRight /></span>
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
