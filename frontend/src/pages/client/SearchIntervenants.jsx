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

  // Load design system fonts (only used by the public path; safe to load globally).
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

  // Dashboard render path (authenticated) — keep as before, Tailwind dark variant.
  const dashboardContent = (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">
          Nos professionnels
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être sélectionnés et certifiés.
        </p>
      </div>

      {/* Barre de recherche */}
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

      {/* Filtres catégories */}
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

      {/* Résultats */}
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

  // Public render path (unauthenticated) — sober WHOOP-inspired design system.
  if (isPublic) {
    const publicContent = (
      <>
        <style>{`
          :root{
            --bg:#f4f4f2;--bg-soft:#ebebe7;--ink:#0a0a0a;--ink-2:#2a2a2a;--ink-3:#555;--ink-4:#888;
            --line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.06);
            --accent:oklch(0.62 0.16 240);--accent-soft:oklch(0.62 0.16 240 / 0.12);--on-accent:#fff;
          }
          .si-eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin:0 0 16px}
          .si-display{font-family:"Archivo Narrow","Archivo",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.015em;line-height:.95;color:var(--ink);margin:0 0 18px;font-size:clamp(48px,7vw,96px)}
          .si-sub{font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;font-size:15.5px;color:var(--ink-2);line-height:1.6;margin:0;max-width:620px}

          .si-searchbar{background:#fff;border:1px solid var(--line);display:flex;align-items:center;padding:6px;gap:4px;flex-wrap:wrap}
          .si-searchbar-field{display:flex;align-items:center;gap:10px;padding:0 14px;flex:1 1 220px;min-width:0}
          .si-searchbar-input{flex:1;background:transparent;border:none;outline:none;font-family:"Inter Tight",sans-serif;font-size:14px;color:var(--ink);height:44px;min-width:0}
          .si-searchbar-input::placeholder{color:var(--ink-4)}
          .si-searchbar-sep{width:1px;height:24px;background:var(--line)}
          .si-searchbar-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--ink);color:var(--bg);border:none;cursor:pointer;font-family:"Inter Tight",sans-serif;font-size:13px;font-weight:600;letter-spacing:.02em;height:44px;padding:0 20px;border-radius:999px;flex-shrink:0;transition:transform .15s ease,opacity .2s}
          .si-searchbar-cta:hover{transform:translateY(-1px);opacity:.92}

          .si-cat-row{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 28px}
          .si-cat-pill{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:9px 16px;border-radius:999px;cursor:pointer;background:transparent;color:var(--ink-3);border:1px solid var(--line);transition:color .15s,border-color .15s,background .15s}
          .si-cat-pill:hover{color:var(--ink);border-color:var(--ink-3)}
          .si-cat-pill-active{background:var(--ink);color:var(--bg);border-color:var(--ink)}
          .si-cat-pill-active:hover{color:var(--bg);border-color:var(--ink);background:var(--ink-2)}

          .si-count{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 18px}

          .si-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
          @media(max-width:980px){.si-grid{grid-template-columns:repeat(2,1fr)}}
          @media(max-width:640px){.si-grid{grid-template-columns:1fr}}

          .si-card{background:var(--bg);padding:26px 24px;display:flex;flex-direction:column;gap:14px;text-decoration:none;color:inherit;transition:background .2s ease}
          .si-card:hover{background:var(--bg-soft)}
          .si-card-head{display:flex;gap:14px;align-items:flex-start}
          .si-card-avatar{width:56px;height:56px;border-radius:50%;background:var(--bg-soft);border:1px solid var(--line);flex-shrink:0;overflow:hidden}
          .si-card-avatar img{width:100%;height:100%;object-fit:cover;filter:grayscale(40%)}
          .si-card-name{font-family:"Archivo Narrow",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.005em;font-size:20px;color:var(--ink);line-height:1.05;margin:0}
          .si-card-meta{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 0;display:flex;align-items:center;gap:6px}
          .si-card-stats{display:flex;gap:16px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);align-items:center;flex-wrap:wrap}
          .si-card-stats strong{color:var(--ink);font-weight:600}
          .si-card-bio{font-family:"Inter Tight",sans-serif;font-size:13.5px;color:var(--ink-2);line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
          .si-card-tags{display:flex;flex-wrap:wrap;gap:6px}
          .si-card-tag{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:4px 9px;border:1px solid var(--line);color:var(--ink-3)}
          .si-card-link{margin-top:auto;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600;display:inline-flex;align-items:center;gap:6px}

          .si-empty{padding:80px 32px;text-align:center;border:1px solid var(--line);background:var(--bg)}
          .si-empty-text{font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0}

          .si-spinner{width:36px;height:36px;border:1.5px solid var(--line);border-top-color:var(--ink);border-radius:50%;animation:si-spin 0.8s linear infinite}
          @keyframes si-spin{to{transform:rotate(360deg)}}
        `}</style>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <p className="si-eyebrow"></p>
          <h1 className="si-display">Trouvez votre expert.</h1>
          <p className="si-sub">
            Coachs sportifs, nutritionnistes, psychologues du sport et praticiens bien-être sélectionnés et certifiés.
          </p>
        </div>

        {/* Search bar */}
        <div className="si-searchbar">
          <div className="si-searchbar-field">
            <Search size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            <input
              type="text"
              className="si-searchbar-input"
              placeholder="Nom, spécialité, sport..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="si-searchbar-sep" />
          <div className="si-searchbar-field" style={{ flex: '0 1 200px' }}>
            <MapPin size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            <input
              type="text"
              className="si-searchbar-input"
              placeholder="Ville..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ width: 120 }}
            />
          </div>
          <button onClick={fetchIntervenants} className="si-searchbar-cta">
            <SlidersHorizontal size={14} />
            Filtrer
          </button>
        </div>

        {/* Category pills */}
        <div className="si-cat-row">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={active ? 'si-cat-pill si-cat-pill-active' : 'si-cat-pill'}
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
              {filtered.map((intervenant) => (
                <Link
                  key={intervenant.id}
                  to={`/coaches/${intervenant.id}`}
                  className="si-card"
                >
                  <div className="si-card-head">
                    <div className="si-card-avatar">
                      <img
                        src={intervenant.avatarUrl || (intervenant.gender === 'FEMME' ? avatarFemale : avatarMale)}
                        alt={intervenant.firstName}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className="si-card-name">
                        {intervenant.firstName} {intervenant.lastName}
                      </h3>
                      {intervenant.profile?.city && (
                        <p className="si-card-meta">
                          <MapPin size={11} /> {intervenant.profile.city}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="si-card-stats">
                    {intervenant.averageRating != null ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Star size={11} fill="currentColor" style={{ color: 'var(--ink)' }} />
                        <strong>{intervenant.averageRating}</strong>
                        <span>· {intervenant.reviewCount} avis</span>
                      </span>
                    ) : intervenant.sessionsDone > 0 ? (
                      <span><strong>{intervenant.sessionsDone}</strong> séance{intervenant.sessionsDone > 1 ? 's' : ''}</span>
                    ) : (
                      <span>// Nouveau</span>
                    )}
                    {intervenant.profile?.experience != null && (
                      <span><strong>{intervenant.profile.experience}</strong> ans d'exp.</span>
                    )}
                  </div>

                  {intervenant.profile?.bio && (
                    <p className="si-card-bio">{intervenant.profile.bio}</p>
                  )}

                  {intervenant.profile?.specialties?.length > 0 && (
                    <div className="si-card-tags">
                      {intervenant.profile.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="si-card-tag">{s}</span>
                      ))}
                    </div>
                  )}

                  <span className="si-card-link">
                    Voir le profil <ChevronRight size={12} />
                  </span>
                </Link>
              ))}
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
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '96px 32px 80px',
        }}>
          {publicContent}
        </div>
      </div>
    );
  }

  return <div className="max-w-5xl">{dashboardContent}</div>;
}
