import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { userApi } from '../../services/user.api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import { MapPin, Star, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { CATEGORY_LABELS } from '../../utils/constants';
import PublicNavbar from '../../components/layout/PublicNavbar';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';

const CATEGORIES = ['Tous', 'SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'];

export default function SearchIntervenants() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [intervenants, setIntervenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(
    CATEGORIES.includes(searchParams.get('category')) ? searchParams.get('category') : 'Tous'
  );

  const isPublic = !user;

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
      .getIntervenants({ ...(city && { city }) })
      .then(({ data }) => setIntervenants(data.intervenants))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(fetchIntervenants, []);

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
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">Nos professionnels</h1>
        <p className="mt-1 text-sm text-white/60">
          Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être sélectionnés et certifiés.
        </p>
      </div>

      <div className="rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 bg-white/[0.07] border border-white/20">
        <div className="flex items-center gap-2 flex-1 rounded-xl px-4 h-11 bg-white/[0.06]">
          <Search className="w-4 h-4 shrink-0 text-white/40" />
          <input
            type="text"
            placeholder="Nom, spécialité, sport..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl px-4 h-11 bg-white/[0.06]">
          <MapPin className="w-4 h-4 shrink-0 text-white/40" />
          <input
            type="text"
            placeholder="Ville..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-28 bg-transparent text-sm text-white placeholder-white/40 outline-none"
          />
        </div>
        <button
          onClick={fetchIntervenants}
          className="h-11 px-5 bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtrer
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeCategory === cat
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-white/[0.05] text-white/70 border-white/10 hover:border-white/30 hover:text-white'
              }`}
          >
            {cat === 'Tous' ? 'Tous' : CATEGORY_LABELS?.[cat] || cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center bg-white/[0.06] border border-white/20">
          <Search className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <p className="text-white/50 font-medium">Aucun professionnel trouvé</p>
          <p className="text-sm mt-1 text-white/30">Essayez de modifier vos critères de recherche</p>
        </div>
      ) : (
        <>
          <p className="text-sm mb-4 text-white/50">
            {filtered.length} professionnel{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((intervenant) => (
              <Link
                key={intervenant.id}
                to={`/coaches/${intervenant.id}`}
                className="rounded-2xl border p-5 hover:-translate-y-0.5 transition-all text-left w-full group bg-white/[0.07] border-white/[0.18] hover:bg-white/[0.11] hover:border-white/30"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={intervenant.avatarUrl || (intervenant.gender === 'FEMME' ? avatarFemale : avatarMale)}
                    alt={intervenant.firstName}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-white group-hover:text-primary-400 transition-colors">
                          {intervenant.firstName} {intervenant.lastName}
                        </p>
                        {intervenant.profile?.city && (
                          <p className="text-xs flex items-center gap-1 mt-0.5 text-white/40">
                            <MapPin className="w-3 h-3" />{intervenant.profile.city}
                          </p>
                        )}
                      </div>
                      {intervenant.profile?.experience != null && (
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-white">{intervenant.profile.experience} ans</span>
                          <p className="text-xs text-white/40">d'expérience</p>
                        </div>
                      )}
                    </div>
                    {intervenant.averageRating != null ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">{intervenant.averageRating}</span>
                        <span className="text-xs text-white/40">({intervenant.reviewCount} avis)</span>
                      </div>
                    ) : intervenant.sessionsDone > 0 ? (
                      <span className="text-xs mt-1 block text-white/40">{intervenant.sessionsDone} séance{intervenant.sessionsDone > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-xs mt-1 block text-white/40">Nouveau</span>
                    )}
                    {intervenant.profile?.bio && (
                      <p className="text-sm mt-2 line-clamp-2 leading-relaxed text-white/50">{intervenant.profile.bio}</p>
                    )}
                    {intervenant.profile?.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {intervenant.profile.specialties.slice(0, 3).map((s) => (
                          <span key={s} className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary-500/20 text-primary-300 border border-primary-500/30">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary-400">
                      Voir le profil <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );

  // ── Public (unauthenticated) ───────────────────────────────────────
  if (isPublic) {
    const publicContent = (
      <>
        <style>{`
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
        `}</style>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <p className="si-eyebrow" style={{ marginBottom: 16 }}></p>
          <h1 className="si-display" style={{ fontSize: 'clamp(48px,7vw,96px)', marginBottom: 20 }}>
            Trouvez votre<br />expert.
          </h1>
          <p className="si-lede" style={{ marginBottom: 32 }}>
            Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être — sélectionnés et certifiés.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); fetchIntervenants(); }}
            className="si-searchbar"
          >
            <Search size={16} style={{ color: 'var(--ink-4)', flexShrink: 0, marginLeft: 8 }} />
            <input
              type="text"
              placeholder="Sport, nutrition, yoga..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="si-searchbar-sep" />
            <MapPin size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ width: 90 }}
            />
            <button type="submit" className="si-btn si-btn-primary si-btn-sm" style={{ borderRadius: 4 }}>
              Rechercher
            </button>
          </form>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`si-btn si-btn-sm ${active ? 'si-btn-active' : 'si-btn-ghost'}`}
              >
                {cat === 'Tous' ? 'Tous' : CATEGORY_LABELS?.[cat] || cat}
              </button>
            );
          })}
        </div>

        {/* Results */}
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

            <div className="si-banner" style={{ marginTop: 48 }}>
              <div>
                <h3>Réservez votre séance.</h3>
                <p>Prenez rendez-vous en 60 secondes avec le pro qui correspond à votre objectif. Sans abonnement — à partir de 40€.</p>
              </div>
              <Link to="/register?role=CLIENT" className="si-btn si-btn-on-dark si-btn-lg">
                Créer un compte →
              </Link>
            </div>
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
        <PublicNavbar transparent={false} />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
          {publicContent}
        </div>
      </div>
    );
  }

  return <div className="max-w-5xl">{dashboardContent}</div>;
}
