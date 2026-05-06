import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/user.api';
import { coachServiceApi } from '../../services/coachService.api';
import { reviewApi } from '../../services/review.api';
import { useAuth } from '../../hooks/useAuth';
import { MapPin, Star, Clock, User, Users, ArrowLeft, ChevronRight, GraduationCap, BadgeCheck } from 'lucide-react';
import { CATEGORY_LABELS } from '../../utils/constants';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';
import PublicNavbar from '../../components/layout/PublicNavbar';

const ACCENT = 'oklch(0.62 0.16 240)';

const SESSION_TYPE_CONFIG = {
  SOLO: { label: 'Individuel', Icon: User },
  DUO: { label: 'Duo', Icon: Users },
  GROUP: { label: 'Collectif', Icon: Users },
};

export default function CoachPublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      userApi.getIntervenantById(id),
      coachServiceApi.getByIntervenant(id),
      reviewApi.getForIntervenant(id),
    ])
      .then(([coachRes, servicesRes, reviewsRes]) => {
        setCoach(coachRes.data);
        setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
        setReviews(reviewsRes.data?.reviews || []);
      })
      .catch(() => setError('Profil introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load design system fonts.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Archivo+Narrow:wght@700;800&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f4f4f2',
      }}>
        <style>{`@keyframes cpp-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: 36, height: 36,
          border: '1.5px solid rgba(0,0,0,.10)',
          borderTopColor: '#0a0a0a',
          borderRadius: '50%',
          animation: 'cpp-spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f4f4f2', gap: 18,
        fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
      }}>
        <p style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase',
          color: '#555', margin: 0,
        }}>
          // {error || 'Profil introuvable'}
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: '1px solid rgba(0,0,0,.10)',
            color: '#0a0a0a', cursor: 'pointer',
            fontFamily: '"Inter Tight", sans-serif', fontWeight: 500, fontSize: 13.5,
            height: 40, padding: '0 18px', borderRadius: 999,
          }}
        >
          <ArrowLeft size={14} /> Retour aux coachs
        </button>
      </div>
    );
  }

  const profile = coach.profile || {};
  const avgRating = coach.averageRating;
  const avgRatingFmt = avgRating != null
    ? Number(avgRating).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : null;
  const reviewCount = coach.reviewCount || reviews.length;
  const sessionsDone = coach.sessionsDone || 0;
  const minPrice = services.length > 0 ? Math.min(...services.map((s) => Number(s.price))) : null;
  const bookBasePath = user?.role === 'CLIENT' ? '/dashboard/client' : null;

  const statsRow = [
    avgRating != null ? { value: avgRatingFmt, suffix: '/5', label: 'Note moyenne' } : null,
    profile.experience != null ? { value: profile.experience, suffix: 'ans', label: "D'expérience" } : null,
    sessionsDone > 0 ? { value: sessionsDone, suffix: '', label: 'Séances réalisées' } : null,
    reviewCount > 0 ? { value: reviewCount, suffix: '', label: 'Avis clients' } : null,
  ].filter((x) => x !== null);

  return (
    <div style={{
      fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
      background: '#f4f4f2',
      minHeight: '100vh',
      color: '#0a0a0a',
      fontSize: 15, lineHeight: 1.5,
    }}>
      <style>{`
        :root{
          --bg:#f4f4f2;--bg-soft:#ebebe7;--ink:#0a0a0a;--ink-2:#2a2a2a;--ink-3:#555;--ink-4:#888;
          --line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.06);
          --accent:oklch(0.62 0.16 240);--accent-soft:oklch(0.62 0.16 240 / 0.12);--on-accent:#fff;
        }
        .cpp-container{max-width:1200px;margin:0 auto;padding:0 32px}
        .cpp-eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
        .cpp-mono{font-family:"JetBrains Mono",monospace}
        .cpp-display{font-family:"Archivo Narrow","Archivo",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.015em;line-height:.9}
        .cpp-num{font-family:"Archivo",sans-serif;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em}

        .cpp-hero{background:var(--bg-soft);position:relative;overflow:hidden;padding-top:64px;border-bottom:1px solid var(--line)}
        .cpp-hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,0,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.025) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
        .cpp-back{display:inline-flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);text-decoration:none;background:transparent;border:none;cursor:pointer;padding:0;transition:color .15s}
        .cpp-back:hover{color:var(--ink)}

        .cpp-hero-row{display:flex;align-items:flex-start;gap:32px;flex-wrap:wrap;margin-top:36px}
        .cpp-avatar-wrap{position:relative;flex-shrink:0}
        .cpp-avatar{width:96px;height:96px;border-radius:8px;object-fit:cover;border:1px solid var(--line);background:#fff;filter:grayscale(40%)}
        .cpp-avatar-tag{position:absolute;bottom:-8px;right:-8px;font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:600;letter-spacing:.05em;background:var(--accent);color:var(--on-accent);padding:4px 8px;border-radius:3px;display:inline-flex;align-items:center;gap:3px}

        .cpp-name{margin:0;font-size:clamp(48px,6vw,86px)}
        .cpp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}
        .cpp-tag{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:5px 10px;border:1px solid var(--line);color:var(--ink-3);background:transparent}
        .cpp-meta-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:18px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
        .cpp-meta-item{display:inline-flex;align-items:center;gap:6px}

        .cpp-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:"Inter Tight",sans-serif;font-weight:600;font-size:13.5px;letter-spacing:.02em;border-radius:999px;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s ease,opacity .2s ease;height:48px;padding:0 24px;background:var(--ink);color:var(--bg);white-space:nowrap}
        .cpp-cta:hover{transform:translateY(-1px);opacity:.92}
        .cpp-cta-sm{height:36px;padding:0 16px;font-size:12.5px}
        .cpp-cta-block{width:100%}
        .cpp-cta-ghost{background:transparent;color:var(--ink);border-color:var(--line)}
        .cpp-cta-ghost:hover{border-color:var(--ink)}

        .cpp-hero-foot{padding-top:36px;margin-top:48px;border-top:1px solid var(--line);padding-bottom:48px}
        .cpp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
        .cpp-stat-num{font-family:"Archivo",sans-serif;font-weight:700;font-size:42px;line-height:1;letter-spacing:-.02em;color:var(--ink)}
        .cpp-stat-suffix{font-family:"JetBrains Mono",monospace;font-size:14px;color:var(--ink-3);margin-left:4px;font-weight:400;letter-spacing:0}
        .cpp-stat-label{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-top:8px}

        .cpp-content{padding:64px 0 96px}
        .cpp-grid{display:grid;grid-template-columns:1fr 340px;gap:56px;align-items:start}

        .cpp-section{display:flex;flex-direction:column;gap:18px}
        .cpp-section-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .cpp-section-h{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);font-weight:500;margin:0}
        .cpp-section-count{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-4);letter-spacing:.12em}

        .cpp-bio{font-family:"Inter Tight",sans-serif;font-size:15.5px;color:var(--ink-2);line-height:1.7;margin:0;white-space:pre-line}

        .cpp-charac{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
        @media(max-width:640px){.cpp-charac{grid-template-columns:1fr}}
        .cpp-charac-item{background:var(--bg);padding:18px 20px;display:flex;align-items:flex-start;gap:14px}
        .cpp-charac-icon{width:36px;height:36px;border:1px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ink);flex-shrink:0}
        .cpp-charac-title{font-family:"Inter Tight",sans-serif;font-size:14px;font-weight:600;color:var(--ink);margin:0}
        .cpp-charac-sub{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:4px}

        .cpp-typical{border:1px solid var(--line);background:var(--bg);padding:24px 26px}
        .cpp-typical p{font-family:"Inter Tight",sans-serif;font-size:14.5px;color:var(--ink-2);line-height:1.7;margin:0;white-space:pre-line}

        .cpp-svc-list{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line)}
        .cpp-svc{background:var(--bg);padding:22px 24px;display:flex;align-items:center;gap:20px;transition:background .2s}
        .cpp-svc:hover{background:var(--bg-soft)}
        .cpp-svc-info{flex:1;min-width:0}
        .cpp-svc-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
        .cpp-svc-name{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:.005em;color:var(--ink);margin:0}
        .cpp-svc-st{display:inline-flex;align-items:center;gap:4px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:3px 8px;border:1px solid var(--line);color:var(--ink-3)}
        .cpp-svc-cat{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-4)}
        .cpp-svc-desc{font-family:"Inter Tight",sans-serif;font-size:13.5px;color:var(--ink-2);line-height:1.55;margin:0 0 8px}
        .cpp-svc-dur{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;color:var(--ink-3);display:inline-flex;align-items:center;gap:5px}
        .cpp-svc-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0}
        .cpp-svc-price{font-family:"Archivo",sans-serif;font-weight:700;font-size:32px;line-height:1;letter-spacing:-.02em;color:var(--ink)}
        .cpp-svc-price-cur{font-family:"JetBrains Mono",monospace;font-size:14px;color:var(--ink-3);margin-left:2px;font-weight:400;letter-spacing:0}
        @media(max-width:640px){.cpp-svc{flex-direction:column;align-items:flex-start}.cpp-svc-right{flex-direction:row;align-items:center;align-self:stretch;justify-content:space-between}}

        .cpp-empty{border:1px solid var(--line);background:var(--bg);padding:60px 32px;text-align:center;font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}

        .cpp-reviews{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line)}
        .cpp-review{background:var(--bg);padding:22px 24px}
        .cpp-review-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .cpp-review-stars{display:flex;gap:3px;color:var(--ink)}
        .cpp-review-date{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-4)}
        .cpp-review-comment{font-family:"Inter Tight",sans-serif;font-size:14.5px;color:var(--ink-2);line-height:1.7;margin:0}
        .cpp-review-author{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;color:var(--ink-3);margin-top:14px;margin-bottom:0}

        .cpp-sidebar{position:sticky;top:80px;border:1px solid var(--line);background:var(--bg);padding:28px}
        .cpp-rating-num{display:flex;align-items:baseline;gap:6px}
        .cpp-rating-big{font-family:"Archivo",sans-serif;font-weight:700;font-size:60px;color:var(--ink);line-height:1;letter-spacing:-.03em}
        .cpp-rating-deno{font-family:"JetBrains Mono",monospace;font-size:14px;color:var(--ink-3);font-weight:400}
        .cpp-rating-stars{display:flex;gap:3px;margin-top:10px;color:var(--ink)}
        .cpp-rating-count{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-top:8px}
        .cpp-price-block{padding-top:22px;margin-top:22px;border-top:1px solid var(--line)}
        .cpp-price-label{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px}
        .cpp-price-num{font-family:"Archivo",sans-serif;font-weight:700;font-size:42px;line-height:1;letter-spacing:-.025em;color:var(--ink);margin:0}
        .cpp-price-cur{font-family:"JetBrains Mono",monospace;font-size:18px;color:var(--ink-3);margin-left:4px;font-weight:400;letter-spacing:0}
        .cpp-side-cta-wrap{margin-top:22px}
        .cpp-side-meta{margin-top:22px;padding-top:22px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
        .cpp-side-meta-item{display:flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}

        @media(max-width:1024px){
          .cpp-grid{grid-template-columns:1fr}
          .cpp-sidebar{position:static}
        }
        @media(max-width:640px){
          .cpp-stats{grid-template-columns:1fr 1fr}
          .cpp-hero-row{flex-direction:column}
        }
      `}</style>

      <PublicNavbar transparent={false} />

      {/* HERO */}
      <section className="cpp-hero">
        <div className="cpp-hero-grid" />
        <div className="cpp-container" style={{ position: 'relative' }}>
          <div style={{ paddingTop: 32 }}>
            <button onClick={() => navigate(-1)} className="cpp-back">
              <ArrowLeft size={12} /> Retour
            </button>
          </div>

          <div className="cpp-hero-row">
            {/* Avatar */}
            <div className="cpp-avatar-wrap">
              <img
                src={coach.avatarUrl || (coach.gender === 'FEMME' ? avatarFemale : avatarMale)}
                alt={`${coach.firstName} ${coach.lastName}`}
                className="cpp-avatar"
              />
              {avgRating != null && (
                <div className="cpp-avatar-tag">
                  <Star size={9} fill="currentColor" strokeWidth={0} /> {avgRatingFmt}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 className="cpp-name cpp-display">
                {coach.firstName}<br />{coach.lastName}
              </h1>

              {profile.specialties?.length > 0 && (
                <div className="cpp-tags">
                  {profile.specialties.map((s) => (
                    <span key={s} className="cpp-tag">{s}</span>
                  ))}
                </div>
              )}

              <div className="cpp-meta-row">
                {profile.city && (
                  <span className="cpp-meta-item">
                    <MapPin size={11} /> {profile.city}
                  </span>
                )}
                {sessionsDone > 0 && (
                  <span className="cpp-meta-item">
                    {sessionsDone} séance{sessionsDone > 1 ? 's' : ''} réalisée{sessionsDone > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <a href="#services" className="cpp-cta" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              Réserver une séance <ChevronRight size={14} />
            </a>
          </div>

          {/* Stats strip */}
          {statsRow.length > 0 && (
            <div className="cpp-hero-foot">
              <div className="cpp-stats">
                {statsRow.map((stat, i) => (
                  <div key={i}>
                    <div className="cpp-stat-num">
                      {stat.value}
                      {stat.suffix && <span className="cpp-stat-suffix">{stat.suffix}</span>}
                    </div>
                    <div className="cpp-stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CONTENT */}
      <div className="cpp-container cpp-content">
        <div className="cpp-grid">

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

            {/* About */}
            {profile.bio && (
              <section className="cpp-section">
                <div className="cpp-section-head">
                  <h2 className="cpp-section-h">{'À propos'}</h2>
                </div>
                <p className="cpp-bio">{profile.bio}</p>
              </section>
            )}

            {/* Caractéristiques */}
            {(profile.diplomas?.length > 0 || profile.courseLocations?.length > 0 || profile.serviceAgreement === true) && (
              <section className="cpp-section">
                <div className="cpp-section-head">
                  <h2 className="cpp-section-h">{'Caractéristiques'}</h2>
                </div>
                <div className="cpp-charac">
                  {profile.diplomas?.map((d, i) => (
                    <div key={`dip-${i}`} className="cpp-charac-item">
                      <div className="cpp-charac-icon">
                        <GraduationCap size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cpp-charac-title">{d}</div>
                        <div className="cpp-charac-sub">Diplôme</div>
                      </div>
                    </div>
                  ))}
                  {profile.courseLocations?.length > 0 && (
                    <div className="cpp-charac-item">
                      <div className="cpp-charac-icon">
                        <MapPin size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cpp-charac-title">{profile.courseLocations.join(', ')}</div>
                        <div className="cpp-charac-sub">Lieu du cours</div>
                      </div>
                    </div>
                  )}
                  {profile.serviceAgreement === true && (
                    <div className="cpp-charac-item">
                      <div className="cpp-charac-icon">
                        <BadgeCheck size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cpp-charac-title">Réduction d'impôt 50%</div>
                        <div className="cpp-charac-sub">Agrément SAP</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Séance type */}
            {profile.typicalSession && (
              <section className="cpp-section">
                <div className="cpp-section-head">
                  <h2 className="cpp-section-h">{'Sa séance type'}</h2>
                </div>
                <div className="cpp-typical">
                  <p>{profile.typicalSession}</p>
                </div>
              </section>
            )}

            {/* Services */}
            <section className="cpp-section" id="services" style={{ scrollMarginTop: 80 }}>
              <div className="cpp-section-head">
                <h2 className="cpp-section-h">{'Formules'}</h2>
                {services.length > 0 && (
                  <span className="cpp-section-count">— {String(services.length).padStart(2, '0')}</span>
                )}
              </div>

              {services.length === 0 ? (
                <div className="cpp-empty">
                  Ce professionnel n'a pas encore configuré ses services
                </div>
              ) : (
                <div className="cpp-svc-list">
                  {services.map((svc) => {
                    const stConfig = SESSION_TYPE_CONFIG[svc.sessionType] || SESSION_TYPE_CONFIG.SOLO;
                    const StIcon = stConfig.Icon;
                    const bookLink = bookBasePath ? `${bookBasePath}/book/${coach.id}` : '/register?role=CLIENT';
                    return (
                      <div key={svc.id} className="cpp-svc">
                        <div className="cpp-svc-info">
                          <div className="cpp-svc-head">
                            <h3 className="cpp-svc-name">{svc.name}</h3>
                            <span className="cpp-svc-st">
                              <StIcon size={9} />
                              {stConfig.label}
                              {svc.sessionType === 'GROUP' && svc.maxParticipants && ` · ${svc.maxParticipants} max`}
                            </span>
                            <span className="cpp-svc-cat">{CATEGORY_LABELS[svc.category] || svc.category}</span>
                          </div>
                          {svc.description && (
                            <p className="cpp-svc-desc">{svc.description}</p>
                          )}
                          <div className="cpp-svc-dur">
                            <Clock size={11} /> {svc.durationMinutes} min
                          </div>
                        </div>

                        <div className="cpp-svc-right">
                          <span className="cpp-svc-price">
                            {Number(svc.price).toFixed(0)}<span className="cpp-svc-price-cur">€</span>
                          </span>
                          <Link to={bookLink} className="cpp-cta cpp-cta-sm">
                            Réserver
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section className="cpp-section">
              <div className="cpp-section-head">
                <h2 className="cpp-section-h">{'Avis clients'}</h2>
                {reviewCount > 0 && (
                  <span className="cpp-section-count">— {String(reviewCount).padStart(2, '0')}</span>
                )}
              </div>

              {reviews.length === 0 ? (
                <div className="cpp-empty">
                  Sois le premier à laisser un avis
                </div>
              ) : (
                <div className="cpp-reviews">
                  {reviews.map((review) => (
                    <div key={review.id} className="cpp-review">
                      <div className="cpp-review-head">
                        <div className="cpp-review-stars">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={13}
                              fill={i <= Math.round(review.rating) ? 'currentColor' : 'none'}
                              style={{ color: i <= Math.round(review.rating) ? 'var(--ink)' : 'var(--ink-4)' }}
                            />
                          ))}
                        </div>
                        <span className="cpp-review-date">
                          {new Date(review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="cpp-review-comment">"{review.comment}"</p>
                      )}
                      {review.client && (
                        <p className="cpp-review-author">
                          — {review.client.firstName} {review.client.lastName?.[0]}.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <div>
            <div className="cpp-sidebar">
              {avgRating != null && (
                <div>
                  <div className="cpp-rating-num">
                    <span className="cpp-rating-big">{avgRatingFmt}</span>
                    <span className="cpp-rating-deno">/5</span>
                  </div>
                  <div className="cpp-rating-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i <= Math.round(avgRating) ? 'currentColor' : 'none'}
                        style={{ color: i <= Math.round(avgRating) ? 'var(--ink)' : 'var(--ink-4)' }}
                      />
                    ))}
                  </div>
                  <p className="cpp-rating-count">{reviewCount} avis clients</p>
                </div>
              )}

              {minPrice != null && (
                <div className="cpp-price-block">
                  <p className="cpp-price-label">À partir de</p>
                  <p className="cpp-price-num">
                    {minPrice.toFixed(0)}<span className="cpp-price-cur">€</span>
                  </p>
                </div>
              )}

              <div className="cpp-side-cta-wrap">
                <a href="#services" className="cpp-cta cpp-cta-block">
                  Voir les formules <ChevronRight size={14} />
                </a>
              </div>

              {(profile.city || profile.experience != null) && (
                <div className="cpp-side-meta">
                  {profile.city && (
                    <div className="cpp-side-meta-item">
                      <MapPin size={12} /> {profile.city}
                    </div>
                  )}
                  {profile.experience != null && (
                    <div className="cpp-side-meta-item">
                      <Clock size={12} /> {profile.experience} ans d'expérience
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
