import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/user.api';
import { coachServiceApi } from '../../services/coachService.api';
import { reviewApi } from '../../services/review.api';
import { useAuth } from '../../hooks/useAuth';
import { MapPin, Star, Clock, User, Users, ArrowLeft, GraduationCap, BadgeCheck } from 'lucide-react';
import { CATEGORY_LABELS } from '../../utils/constants';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';
import logo from '../../assets/logo-goupyl-white.png';
import expertCoach from '../../assets/expert-coach.jpg'

const SESSION_TYPE_CONFIG = {
  SOLO: { label: 'Individuel', Icon: User },
  DUO: { label: 'Duo', Icon: Users },
  GROUP: { label: 'Collectif', Icon: Users },
};

const ArrowUpRight = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);

// IMAGE — bandeau du haut de la fiche coach. Remplacez PLACEHOLDER_DARK dans
// le <img className="cpp-hero-img"> par le chemin de votre photo,
// par exemple  src="/images/coach-hero.jpg"  (fichier dans frontend/public/images/).
const PLACEHOLDER_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='700'%3E%3Crect width='1600' height='700' fill='%236d6b66'/%3E%3Cg stroke='%23d8d6d1' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='752' y='312' width='96' height='76' rx='10'/%3E%3Ccircle cx='780' cy='340' r='9'/%3E%3Cpath d='M848 372l-34-30-62 46'/%3E%3C/g%3E%3C/svg%3E";

const CPP_CSS = `
  .cpp{--bg:#EBEAE6;--card:#FFFFFF;--ink:#171614;--ink-2:#4c4a46;--ink-3:#8a8781;--line:#E4E2DC;--orange:#F4530F;min-height:100vh;background:var(--bg);padding:20px;font-family:"Inter",system-ui,-apple-system,sans-serif;color:var(--ink);font-size:15px;line-height:1.5;display:flex;flex-direction:column;gap:14px;-webkit-font-smoothing:antialiased}
  .cpp *{box-sizing:border-box}

  .cpp-hero{position:relative;border-radius:22px;overflow:hidden;padding:26px 40px 0;background:linear-gradient(150deg,#9a9892 0%,#6d6b66 55%,#55534f 100%);color:#fff}
  .cpp-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .cpp-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,.30) 0%,rgba(15,15,15,.55) 100%);pointer-events:none}
  .cpp-nav{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
  .cpp-nav-links{display:flex;gap:30px;font-size:15px;font-weight:500}
  .cpp-nav-links a{color:#fff;text-decoration:none;opacity:.95}
  .cpp-nav-links a:hover{opacity:.7}
  .cpp-logo{position:absolute;left:50%;transform:translateX(-50%)}
  .cpp-nav-cta{display:inline-flex;align-items:center;gap:12px;border-radius:999px;padding:6px 6px 6px 22px;font-size:15px;font-weight:500;background:#fff;color:var(--ink);text-decoration:none;transition:transform .15s ease;white-space:nowrap}
  .cpp-nav-cta:hover{transform:translateY(-1px)}
  .cpp-nav-cta span{width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,#FF7A33,#F4530F);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}

  .cpp-back{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:8px 16px;cursor:pointer;margin-top:36px;transition:background .2s;font-family:inherit}
  .cpp-back:hover{background:rgba(255,255,255,.24)}

  .cpp-hero-row{display:flex;align-items:flex-start;gap:32px;flex-wrap:wrap;margin-top:30px;position:relative;z-index:1}
  .cpp-avatar-wrap{position:relative;flex-shrink:0}
  .cpp-avatar{width:104px;height:104px;border-radius:20px;object-fit:cover;border:2px solid rgba(255,255,255,.6);background:#fff}
  .cpp-avatar-tag{position:absolute;bottom:-10px;right:-10px;font-size:11.5px;font-weight:600;background:var(--orange);color:#fff;padding:5px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:4px}

  .cpp-name{margin:0;font-size:clamp(44px,5.4vw,80px);font-weight:700;letter-spacing:-.025em;line-height:.98;color:#fff}
  .cpp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}
  .cpp-tag{font-size:12px;font-weight:500;padding:6px 13px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;color:#fff}
  .cpp-meta-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:16px;font-size:13px;font-weight:500;color:rgba(255,255,255,.85)}
  .cpp-meta-item{display:inline-flex;align-items:center;gap:6px}

  .cpp-cta{display:inline-flex;align-items:center;justify-content:center;gap:12px;font-family:inherit;font-weight:600;font-size:14.5px;border-radius:999px;border:none;cursor:pointer;text-decoration:none;transition:transform .15s ease;padding:6px 6px 6px 22px;background:var(--orange);color:#fff;white-space:nowrap}
  .cpp-cta:hover{transform:translateY(-1px)}
  .cpp-cta span{width:36px;height:36px;border-radius:50%;background:#fff;color:var(--orange);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .cpp-cta-sm{font-size:13.5px;padding:5px 5px 5px 18px}
  .cpp-cta-sm span{width:30px;height:30px}
  .cpp-cta-block{width:100%}

  .cpp-hero-foot{padding-top:30px;margin-top:40px;border-top:1px solid rgba(255,255,255,.25);padding-bottom:36px;position:relative;z-index:1}
  .cpp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
  .cpp-stat-num{font-weight:700;font-size:40px;line-height:1;letter-spacing:-.02em;color:#fff}
  .cpp-stat-suffix{font-size:15px;color:rgba(255,255,255,.7);margin-left:4px;font-weight:500}
  .cpp-stat-label{font-size:12px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-top:8px}

  .cpp-content{background:var(--card);border-radius:22px;padding:56px 40px 72px}
  .cpp-inner{max-width:1200px;margin:0 auto}
  .cpp-grid{display:grid;grid-template-columns:1fr 340px;gap:56px;align-items:start}

  .cpp-section{display:flex;flex-direction:column;gap:18px}
  .cpp-section-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  .cpp-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--ink)}
  .cpp-chip i{width:5px;height:5px;border-radius:50%;background:var(--orange);font-style:normal}
  .cpp-section-count{font-size:12px;font-weight:500;color:var(--ink-3)}

  .cpp-bio{font-size:15.5px;color:var(--ink-2);line-height:1.7;margin:0;white-space:pre-line}

  .cpp-charac{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  @media(max-width:640px){.cpp-charac{grid-template-columns:1fr}}
  .cpp-charac-item{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;display:flex;align-items:flex-start;gap:14px}
  .cpp-charac-icon{width:38px;height:38px;background:#FEF1EA;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--orange);flex-shrink:0}
  .cpp-charac-title{font-size:14px;font-weight:600;color:var(--ink);margin:0}
  .cpp-charac-sub{font-size:11.5px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin-top:4px}

  .cpp-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  @media(max-width:640px){.cpp-gallery{grid-template-columns:repeat(2,1fr)}}
  .cpp-gallery-item{aspect-ratio:1/1;overflow:hidden;background:#EFEDE8;border:none;padding:0;cursor:zoom-in;display:block;width:100%;border-radius:12px}
  .cpp-gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .3s ease}
  .cpp-gallery-item:hover img{transform:scale(1.04)}
  .cpp-lightbox{position:fixed;inset:0;z-index:100;background:rgba(15,15,15,.92);display:flex;align-items:center;justify-content:center;padding:32px;cursor:zoom-out}
  .cpp-lightbox img{max-width:92vw;max-height:88vh;object-fit:contain;border-radius:12px}
  .cpp-lightbox-close{position:absolute;top:20px;right:24px;background:none;border:1px solid rgba(255,255,255,.35);color:#fff;width:40px;height:40px;border-radius:999px;font-size:18px;cursor:pointer}

  .cpp-typical{border:1px solid var(--line);background:#fff;border-radius:14px;padding:24px 26px}
  .cpp-typical p{font-size:14.5px;color:var(--ink-2);line-height:1.7;margin:0;white-space:pre-line}

  .cpp-svc-list{display:flex;flex-direction:column;gap:12px}
  .cpp-svc{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 24px;display:flex;align-items:center;gap:20px;transition:border-color .2s,box-shadow .2s}
  .cpp-svc:hover{border-color:#c9c7c1;box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .cpp-svc-info{flex:1;min-width:0}
  .cpp-svc-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
  .cpp-svc-name{font-size:17px;font-weight:600;letter-spacing:-.01em;color:var(--ink);margin:0}
  .cpp-svc-st{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;padding:4px 11px;border:1px solid var(--line);border-radius:999px;color:var(--ink-2)}
  .cpp-svc-cat{font-size:11.5px;font-weight:500;color:var(--ink-3)}
  .cpp-svc-desc{font-size:13.5px;color:var(--ink-2);line-height:1.55;margin:0 0 8px}
  .cpp-svc-dur{font-size:12.5px;font-weight:500;color:var(--ink-3);display:inline-flex;align-items:center;gap:5px}
  .cpp-svc-right{display:flex;flex-direction:column;align-items:flex-end;gap:12px;flex-shrink:0}
  .cpp-svc-price{font-weight:700;font-size:30px;line-height:1;letter-spacing:-.02em;color:var(--ink)}
  .cpp-svc-price-cur{font-size:16px;color:var(--ink-3);margin-left:2px;font-weight:500}
  @media(max-width:640px){.cpp-svc{flex-direction:column;align-items:flex-start}.cpp-svc-right{flex-direction:row;align-items:center;align-self:stretch;justify-content:space-between}}

  .cpp-empty{border:1px dashed var(--line);border-radius:16px;background:transparent;padding:60px 32px;text-align:center;font-size:13.5px;font-weight:500;color:var(--ink-3)}

  .cpp-review-sort{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
  .cpp-review-sort-btn{font-family:inherit;font-size:12.5px;font-weight:500;color:var(--ink-2);background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 16px;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
  .cpp-review-sort-btn:hover{border-color:#c9c7c1;color:var(--ink)}
  .cpp-review-sort-btn.is-active{border-color:var(--orange);background:var(--orange);color:#fff;font-weight:600}
  .cpp-review-more{font-family:inherit;font-size:13.5px;font-weight:500;color:var(--ink-2);background:#fff;border:1px solid var(--line);border-radius:999px;padding:13px 20px;margin-top:16px;width:100%;cursor:pointer;transition:border-color .2s,color .2s}
  .cpp-review-more:hover{border-color:var(--ink);color:var(--ink)}
  .cpp-reviews{display:flex;flex-direction:column;gap:12px}
  .cpp-review{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px 24px}
  .cpp-review-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .cpp-review-stars{display:flex;gap:3px;color:var(--orange)}
  .cpp-review-date{font-size:12px;font-weight:500;color:var(--ink-3)}
  .cpp-review-comment{font-size:14.5px;color:var(--ink-2);line-height:1.7;margin:0}
  .cpp-review-author{font-size:12.5px;font-weight:500;color:var(--ink-3);margin-top:14px;margin-bottom:0}

  .cpp-sidebar{position:sticky;top:20px;border:1px solid var(--line);background:#fff;border-radius:20px;padding:28px}
  .cpp-rating-num{display:flex;align-items:baseline;gap:6px}
  .cpp-rating-big{font-weight:700;font-size:56px;color:var(--ink);line-height:1;letter-spacing:-.03em}
  .cpp-rating-deno{font-size:15px;color:var(--ink-3);font-weight:500}
  .cpp-rating-stars{display:flex;gap:3px;margin-top:10px;color:var(--orange)}
  .cpp-rating-count{font-size:12.5px;font-weight:500;color:var(--ink-3);margin-top:8px}
  .cpp-price-block{padding-top:22px;margin-top:22px;border-top:1px solid var(--line)}
  .cpp-price-label{font-size:12px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px}
  .cpp-price-num{font-weight:700;font-size:40px;line-height:1;letter-spacing:-.025em;color:var(--ink);margin:0}
  .cpp-price-cur{font-size:18px;color:var(--ink-3);margin-left:4px;font-weight:500}
  .cpp-side-cta-wrap{margin-top:22px}
  .cpp-side-meta{margin-top:22px;padding-top:22px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
  .cpp-side-meta-item{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--ink-2)}

  @media(max-width:1024px){
    .cpp-grid{grid-template-columns:1fr}
    .cpp-sidebar{position:static}
  }
  @media(max-width:640px){
    .cpp{padding:10px}
    .cpp-hero{padding:20px 20px 0}
    .cpp-nav-links{display:none}
    .cpp-logo{position:static;transform:none}
    .cpp-stats{grid-template-columns:1fr 1fr}
    .cpp-hero-row{flex-direction:column}
    .cpp-content{padding:36px 20px 48px}
  }
`;

export default function CoachPublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState('recent'); // 'recent' | 'high' | 'low'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

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

    // Galerie — non bloquante pour le reste du profil
    userApi.getPhotos(id).then(({ data }) => setPhotos(data)).catch(() => { });
  }, [id]);

  const sortedReviews = useMemo(() => {
    const arr = [...reviews];
    if (reviewSort === 'high') arr.sort((a, b) => b.rating - a.rating);
    else if (reviewSort === 'low') arr.sort((a, b) => a.rating - b.rating);
    else arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return arr;
  }, [reviews, reviewSort]);

  // Load design system fonts.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#EBEAE6',
      }}>
        <style>{`@keyframes cpp-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: 36, height: 36,
          border: '2px solid #E4E2DC',
          borderTopColor: '#F4530F',
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
        minHeight: '100vh', background: '#EBEAE6', gap: 18,
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
        <p style={{ fontSize: 14.5, fontWeight: 500, color: '#4c4a46', margin: 0 }}>
          {error || 'Profil introuvable'}
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid #E4E2DC',
            color: '#171614', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 500, fontSize: 13.5,
            height: 42, padding: '0 20px', borderRadius: 999,
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
  const REVIEWS_PREVIEW = 5;
  const visibleReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, REVIEWS_PREVIEW);
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
    <div className="cpp">
      <style>{CPP_CSS}</style>

      {/* HERO — carte sombre façon landing */}
      <section className="cpp-hero">
        {/* IMAGE — bandeau du haut de la fiche coach */}
        <img className="cpp-hero-img" src={PLACEHOLDER_DARK} alt="" />
        <header className="cpp-nav">
          <nav className="cpp-nav-links">
            <Link to="/">Accueil</Link>
            <Link to="/#domaines">Domaines</Link>
            <Link to="/#coaches">Coachs</Link>
            <Link to="/#pricing">Tarifs</Link>
          </nav>
          <div className="cpp-logo">
            <Link to="/"><img src={logo} alt="Goupyl Sport" style={{ height: 44, width: 'auto', display: 'block' }} /></Link>
          </div>
          {user ? (
            <Link to="/dashboard" className="cpp-nav-cta">
              Mon espace
              <span><ArrowUpRight color="#fff" /></span>
            </Link>
          ) : (
            <Link to="/login" className="cpp-nav-cta">
              Commencer
              <span><ArrowUpRight color="#fff" /></span>
            </Link>
          )}
        </header>

        <button onClick={() => navigate(-1)} className="cpp-back">
          <ArrowLeft size={13} /> Retour
        </button>

        <div className="cpp-hero-row">
          {/* Avatar */}
          <div className="cpp-avatar-wrap">
            {avatarError ? (
              <div
                className="cpp-avatar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 32,
                  color: '#8a8781',
                  background: '#EFEDE8',
                }}
              >
                {(coach.firstName?.[0] || '').toUpperCase()}
                {(coach.lastName?.[0] || '').toUpperCase() || '?'}
              </div>
            ) : (
              <img
                src={coach.avatarUrl || (coach.gender === 'FEMME' ? avatarFemale : avatarMale)}
                alt={`${coach.firstName} ${coach.lastName}`}
                className="cpp-avatar"
                onError={() => setAvatarError(true)}
              />
            )}
            {avgRating != null && (
              <div className="cpp-avatar-tag">
                <Star size={10} fill="currentColor" strokeWidth={0} /> {avgRatingFmt}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="cpp-name">
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
                  <MapPin size={13} /> {profile.city}
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
            Réserver une séance
            <span><ArrowUpRight /></span>
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
      </section>

      {/* CONTENT — carte blanche */}
      <div className="cpp-content">
        <div className="cpp-inner">
          <div className="cpp-grid">

            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

              {/* About */}
              {profile.bio && (
                <section className="cpp-section">
                  <div className="cpp-section-head">
                    <span className="cpp-chip"><i />À propos</span>
                  </div>
                  <p className="cpp-bio">{profile.bio}</p>
                </section>
              )}

              {/* Caractéristiques */}
              {(profile.diplomas?.length > 0 || profile.courseLocations?.length > 0 || profile.serviceAgreement === true) && (
                <section className="cpp-section">
                  <div className="cpp-section-head">
                    <span className="cpp-chip"><i />Caractéristiques</span>
                  </div>
                  <div className="cpp-charac">
                    {profile.diplomas?.map((d, i) => (
                      <div key={`dip-${i}`} className="cpp-charac-item">
                        <div className="cpp-charac-icon">
                          <GraduationCap size={15} />
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
                          <MapPin size={15} />
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
                          <BadgeCheck size={15} />
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

              {/* Galerie */}
              {photos.length > 0 && (
                <section className="cpp-section">
                  <div className="cpp-section-head">
                    <span className="cpp-chip"><i />Galerie</span>
                    <span className="cpp-section-count">— {String(photos.length).padStart(2, '0')}</span>
                  </div>
                  <div className="cpp-gallery">
                    {photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="cpp-gallery-item"
                        onClick={() => setLightboxPhoto(photo)}
                        title="Agrandir"
                      >
                        <img src={photo.url} alt={`Séance de ${coach.firstName}`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Séance type */}
              {profile.typicalSession && (
                <section className="cpp-section">
                  <div className="cpp-section-head">
                    <span className="cpp-chip"><i />Sa séance type</span>
                  </div>
                  <div className="cpp-typical">
                    <p>{profile.typicalSession}</p>
                  </div>
                </section>
              )}

              {/* Services */}
              <section className="cpp-section" id="services" style={{ scrollMarginTop: 80 }}>
                <div className="cpp-section-head">
                  <span className="cpp-chip"><i />Formules</span>
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
                                <StIcon size={11} />
                                {stConfig.label}
                                {svc.sessionType === 'GROUP' && svc.maxParticipants && ` · ${svc.maxParticipants} max`}
                              </span>
                              <span className="cpp-svc-cat">{CATEGORY_LABELS[svc.category] || svc.category}</span>
                            </div>
                            {svc.description && (
                              <p className="cpp-svc-desc">{svc.description}</p>
                            )}
                            <div className="cpp-svc-dur">
                              <Clock size={12} /> {svc.durationMinutes} min
                            </div>
                          </div>

                          <div className="cpp-svc-right">
                            <span className="cpp-svc-price">
                              {Number(svc.price).toFixed(0)}<span className="cpp-svc-price-cur">€</span>
                            </span>
                            <Link to={bookLink} className="cpp-cta cpp-cta-sm">
                              Réserver
                              <span><ArrowUpRight size={13} /></span>
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
                  <span className="cpp-chip"><i />Avis clients</span>
                  {reviewCount > 0 && (
                    <span className="cpp-section-count">— {String(reviewCount).padStart(2, '0')}</span>
                  )}
                </div>

                {reviews.length > 1 && (
                  <div className="cpp-review-sort">
                    {[
                      { value: 'recent', label: 'Plus récents' },
                      { value: 'high', label: 'Mieux notés' },
                      { value: 'low', label: 'Moins bien notés' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`cpp-review-sort-btn${reviewSort === opt.value ? ' is-active' : ''}`}
                        onClick={() => setReviewSort(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="cpp-empty">
                    Sois le premier à laisser un avis
                  </div>
                ) : (
                  <div className="cpp-reviews">
                    {visibleReviews.map((review) => (
                      <div key={review.id} className="cpp-review">
                        <div className="cpp-review-head">
                          <div className="cpp-review-stars">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                size={13}
                                fill={i <= Math.round(review.rating) ? 'currentColor' : 'none'}
                                style={{ color: i <= Math.round(review.rating) ? '#F4530F' : '#c9c7c1' }}
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

                {reviews.length > REVIEWS_PREVIEW && (
                  <button
                    type="button"
                    className="cpp-review-more"
                    onClick={() => setShowAllReviews((v) => !v)}
                  >
                    {showAllReviews
                      ? 'Voir moins'
                      : `Voir les ${reviews.length - REVIEWS_PREVIEW} autres avis`}
                  </button>
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
                          style={{ color: i <= Math.round(avgRating) ? '#F4530F' : '#c9c7c1' }}
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
                    Voir les formules
                    <span><ArrowUpRight /></span>
                  </a>
                </div>

                {(profile.city || profile.experience != null) && (
                  <div className="cpp-side-meta">
                    {profile.city && (
                      <div className="cpp-side-meta-item">
                        <MapPin size={13} /> {profile.city}
                      </div>
                    )}
                    {profile.experience != null && (
                      <div className="cpp-side-meta-item">
                        <Clock size={13} /> {profile.experience} ans d'expérience
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox galerie */}
      {lightboxPhoto && (
        <div className="cpp-lightbox" onClick={() => setLightboxPhoto(null)}>
          <button
            type="button"
            className="cpp-lightbox-close"
            onClick={() => setLightboxPhoto(null)}
            title="Fermer"
          >
            ×
          </button>
          <img
            src={lightboxPhoto.url}
            alt={`Séance de ${coach.firstName}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
