import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/user.api';
import { CATEGORY_LABELS } from '../../utils/constants';
import avatarMale from '../../assets/avatar-default-male.svg';
import HumanBody3D from '../../components/layout/body';
import avatarFemale from '../../assets/avatar-default-female.svg';
import PublicNavbar from '../../components/layout/PublicNavbar';
import logo from '../../assets/logo-goupyl-sport.png';

// ─── Icon primitives ───────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const IcArrow = (p) => <Icon {...p} d={<><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></>} />;
const IcCheck = (p) => <Icon {...p} d={<path d="M4 12l5 5L20 6" />} stroke={2.4} />;
const IcPlus = (p) => <Icon {...p} d={<><path d="M12 5v14" /><path d="M5 12h14" /></>} />;
const IcRun = (p) => <Icon {...p} d={<><circle cx="13" cy="4" r="2" /><path d="M4 22l4-9 5 2 3-3" /><path d="M9 13l-2 5" /><path d="M15 8l3 4 4-1" /></>} />;
const IcLeaf = (p) => <Icon {...p} d={<><path d="M21 3c-9 0-16 7-16 16h2c0-7 7-14 14-14z" /><path d="M5 19c4-4 8-7 14-12" /></>} />;
const IcBrain = (p) => <Icon {...p} d={<><path d="M9 4a3 3 0 00-3 3v1a3 3 0 00-2 3v1a3 3 0 002 3v2a3 3 0 003 3h0V4z" /><path d="M15 4a3 3 0 013 3v1a3 3 0 012 3v1a3 3 0 01-2 3v2a3 3 0 01-3 3h0V4z" /></>} />;
const IcSpark = (p) => <Icon {...p} d={<><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M5.6 18.4l2.8-2.8" /><path d="M15.6 8.4l2.8-2.8" /></>} />;
const IcSearch = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>} />;
const IcMapPin = (p) => <Icon {...p} d={<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>} />;

// ─── Enterprise plans ──────────────────────────────────────────────
const ENTERPRISE_PLANS = [
  {
    id: 'zen', tag: 'Essentiel', name: 'Zen', role: 'ENTREPRISE',
    priceMonthly: 540, priceYearly: 432,
    desc: "Jusqu'à 10 salariés",
    cta: 'Commencer Zen',
  },
  {
    id: 'pulse', tag: 'Recommandé', name: 'Pulse', role: 'ENTREPRISE',
    priceMonthly: 1060, priceYearly: 848,
    desc: "Jusqu'à 50 salariés",
    cta: 'Choisir Pulse', reco: true,
  },
  {
    id: 'boost', tag: 'Performance', name: 'Boost', role: 'ENTREPRISE',
    priceMonthly: 2199, priceYearly: 1759,
    desc: "Jusqu'à 200 salariés",
    cta: 'Choisir Boost',
  },
];

const COMPARE_SECTIONS = [
  {
    head: 'Accompagnement', rows: [
      ['Coachs sportifs certifiés', true, true, true],
      ['Séances / semaine', '1', '2', '4'],
      ['Tous les domaines', false, true, true],
      ['Suivi nutritionnel', false, true, true],
      ['Préparation mentale', false, false, true],
    ]
  },
  {
    head: 'Application & data', rows: [
      ['App iOS & Android', true, true, true],
      ['Suivi des performances', 'Basique', 'Avancé', 'Avancé'],
      ['Reporting mensuel', false, true, true],
      ['Export de données RH', false, false, true],
      ['API & intégration RH', false, false, true],
    ]
  },
  {
    head: 'Gestion entreprise', rows: [
      ['Espace VOD inclus', true, true, true],
      ['Salariés inclus', '10', '50', '200'],
      ['Account manager dédié', false, true, true],
      ['SLA garanti', false, false, true],
    ]
  },
  {
    head: 'Support', rows: [
      ['Support email', true, true, true],
      ['Support chat 7j/7', false, true, true],
      ['Conseiller dédié', false, false, true],
      ['Garantie satisfait', '14 jours', '30 jours', '60 jours'],
    ]
  },
];

const FAQS = [
  ["Comment fonctionne l'offre entreprise ?", "Souscrivez un abonnement mensuel ou annuel pour offrir à vos salariés un accès à nos professionnels certifiés. Les salariés créent leur compte via un lien d'invitation."],
  ["Les professionnels sont-ils certifiés ?", "Oui. Chaque intervenant soumet ses diplômes lors de l'inscription. Notre équipe vérifie chaque dossier avant activation du profil."],
  ["Puis-je changer de plan ?", "Oui, à tout moment. Le prorata est calculé automatiquement. Annulation possible à tout moment, sans frais."],
  ["Comment réserver une séance en tant que particulier ?", "Créez un compte, trouvez un professionnel selon votre besoin, réservez un créneau et payez directement. Sans abonnement."],
  ["Comment devenir intervenant sur Goupyl Sport ?", "Créez votre compte professionnel, renseignez votre profil et soumettez vos documents. Une fois validé, vous recevez 70% de chaque séance."],
];

// ─── FAQ item ──────────────────────────────────────────────────────
function FaqItem({ q, a, n, open, onToggle }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '24px 0', cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 17 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.14em', marginRight: 18 }}>{String(n).padStart(2, '0')}</span>
          <span>{q}</span>
        </div>
        <span style={{ width: 24, height: 24, border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .25s ease', transform: open ? 'rotate(45deg)' : 'none' }}>
          <IcPlus size={12} />
        </span>
      </div>
      {open && <div style={{ marginTop: 14, color: 'var(--ink-3)', fontSize: 14.5, maxWidth: 680 }}>{a}</div>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@400;500;600;700;800&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    userApi.getIntervenants({ limit: 50 })
      .then(({ data }) => {
        const list = data.intervenants || [];
        const profileScore = (c) => {
          const p = c.profile || {};
          return (p.bio ? 1 : 0) + (p.city ? 1 : 0) + (p.experience != null ? 1 : 0) + ((p.specialties?.length || 0) > 0 ? 1 : 0);
        };
        const sorted = [...list].sort((a, b) => {
          if (b.averageRating != null && a.averageRating != null) return b.averageRating - a.averageRating;
          if (b.averageRating != null) return 1;
          if (a.averageRating != null) return -1;
          return profileScore(b) - profileScore(a);
        });
        setCoaches(sorted.slice(0, 6));
      })
      .catch(() => { });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (searchCity) params.append('city', searchCity);
    navigate(`/search?${params.toString()}`);
  };

  const isYearly = billingCycle === 'yearly';

  const tableCell = (val) => {
    if (val === true) return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)' }}>
        <IcCheck size={12} />
      </span>
    );
    if (val === false) return <span style={{ color: 'var(--ink-4)', fontFamily: '"JetBrains Mono", monospace' }}>—</span>;
    return <span style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600 }}>{val}</span>;
  };

  const recoCellStyle = { background: '#d0d3e1ff' };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif', fontSize: 15, lineHeight: 1.5 }}>
      <style>{`
        :root {
          --bg: #f4f4f2;
          --bg-soft: #ebebe7;
          --bg-dark: #0a0a0a;
          --ink: #0a0a0a;
          --ink-2: #2a2a2a;
          --ink-3: #555;
          --ink-4: #888;
          --line: rgba(0,0,0,.10);
          --line-2: rgba(0,0,0,.06);
          --accent: #252d62;
          --accent-soft: #252d62;
          --on-accent: #fff;
        }
        *{box-sizing:border-box}
        ::selection{background:var(--accent);color:var(--on-accent)}
        .display{font-family:"Archivo Narrow","Archivo",sans-serif;font-weight:700;letter-spacing:-.015em;line-height:.95;text-transform:uppercase}
        .mono{font-family:"JetBrains Mono",monospace}
        .eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
        .num{font-family:"Archivo",sans-serif;font-variant-numeric:tabular-nums}
        .container{max-width:1280px;margin:0 auto;padding:0 32px}

        /* nav */
        .l-nav{position:sticky;top:0;z-index:50;background:color-mix(in oklch,var(--bg) 78%,transparent);backdrop-filter:saturate(150%) blur(14px);border-bottom:1px solid var(--line)}
        .l-nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
        .l-nav-left{display:flex;align-items:center;gap:48px}
        .wordmark{font-family:"Archivo Narrow",sans-serif;font-weight:800;letter-spacing:.04em;font-size:20px;text-transform:uppercase;text-decoration:none;color:var(--ink)}
        .l-nav-links{display:flex;gap:28px}
        .l-nav-link{font-size:13px;font-weight:500;color:var(--ink-2);text-decoration:none;letter-spacing:.01em;transition:color .15s}
        .l-nav-link:hover{color:var(--ink)}
        .l-nav-right{display:flex;align-items:center;gap:8px}

        /* buttons */
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 22px;font-family:"Inter Tight",sans-serif;font-weight:600;font-size:13.5px;letter-spacing:.02em;border-radius:999px;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s ease,background .2s ease,color .2s ease,border-color .2s ease;white-space:nowrap;background:transparent}
        .btn:hover{transform:translateY(-1px)}
        .btn-primary{background:var(--ink);color:var(--bg)}
        .btn-primary:hover{background:var(--ink-2)}
        .btn-accent{background:var(--accent);color:var(--on-accent)}
        .btn-ghost{background:transparent;color:var(--ink);border-color:var(--line)}
        .btn-ghost:hover{border-color:var(--ink)}
        .btn-sm{height:36px;padding:0 16px;font-size:12.5px}
        .btn-lg{height:52px;padding:0 28px;font-size:14.5px}
        .btn-block{width:100%;justify-content:center}
        .btn-on-dark{background:#fff;color:#000;border-color:transparent}

        /* sections */
        .l-section{padding:96px 0;border-bottom:1px solid var(--line)}
        .section-head{display:grid;grid-template-columns:.8fr 1.2fr;gap:48px;align-items:end;margin-bottom:56px}
        .section-head h2{margin:0;font-size:clamp(40px,5vw,72px)}
        .lede{color:var(--ink-2);font-size:16px;max-width:540px}

        /* hero */
        .hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;padding:96px 0 80px;align-items:center}
        .hero-h1{margin:0;font-size:clamp(56px,8.4vw,128px)}
        .hero-sub{margin-top:28px;max-width:520px;font-size:17px;line-height:1.5;color:var(--ink-2)}
        .hero-meta{margin-top:36px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .hero-stats{margin-top:56px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);padding-top:24px;gap:24px}
        .stat-num{font-size:42px;font-weight:700;letter-spacing:-.02em;line-height:1}
        .stat-label{font-size:12px;color:var(--ink-3);margin-top:6px}
        .hero-media{position:relative;aspect-ratio:4/5;overflow:hidden;min-height:400px;}
        .hero-media-img{width:100%;height:100%;object-fit:cover;filter:grayscale(60%) contrast(1.05)}
        .hero-media-tag{position:absolute;left:20px;top:20px;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;background:var(--ink);color:var(--bg);padding:6px 10px}
        .hero-badge{position:absolute;right:20px;bottom:20px;border:1px solid var(--ink);background:var(--bg);padding:14px 16px;display:flex;align-items:center;gap:12px;min-width:180px}
        .hero-badge-dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
        .hero-badge-num{font-family:"Archivo",sans-serif;font-weight:800;font-size:24px;line-height:1}
        .hero-badge-label{font-size:10px;color:var(--ink-3);letter-spacing:.14em;text-transform:uppercase;margin-top:4px}

        /* ticker */
        .ticker{border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden;background:var(--bg)}
        .ticker-track{display:flex;gap:64px;padding:18px 0;animation:tick 38s linear infinite;width:max-content}
        .ticker-item{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:64px;white-space:nowrap}
        .ticker-item::after{content:"●";color:var(--accent);font-size:8px}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        /* categories grid */
        .cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
        .cat{background:var(--bg);padding:32px 28px 28px;display:flex;flex-direction:column;min-height:280px;position:relative;transition:background .2s ease;cursor:pointer;text-decoration:none;color:inherit}
        .cat:hover{background:var(--bg-soft)}
        .cat-num{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.14em}
        .cat-icon{width:56px;height:56px;margin:24px 0 auto;border:1px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ink)}
        .cat-title{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:32px;text-transform:uppercase;letter-spacing:-.01em;margin-top:24px}
        .cat-desc{font-size:13.5px;color:var(--ink-3);margin-top:8px;max-width:240px}
        .cat-arrow{position:absolute;right:24px;bottom:24px;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;transition:all .2s ease}
        .cat:hover .cat-arrow{background:var(--accent);color:#fff;border-color:var(--accent);transform:translate(2px,-2px)}

        /* pros grid */
        .pros-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
        .pro-card{background:var(--bg);padding:24px;display:flex;gap:16px;align-items:flex-start;text-decoration:none;color:inherit;transition:background .2s}
        .pro-card:hover{background:var(--bg-soft)}
        .pro-avatar{width:56px;height:56px;border-radius:50%;background:var(--bg-soft);border:1px solid var(--line);flex-shrink:0;overflow:hidden}
        .pro-avatar img{width:100%;height:100%;object-fit:cover;filter:grayscale(30%)}
        .pro-name{font-weight:600;font-size:14.5px}
        .pro-role{font-size:12px;color:var(--ink-3);margin-top:2px}
        .pro-stats{margin-top:10px;display:flex;gap:14px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3)}
        .pro-stats strong{color:var(--ink);font-weight:600}
        .pro-pill{display:inline-block;padding:3px 8px;font-size:10.5px;border:1px solid var(--line);margin-top:10px;font-family:"JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase}

        /* banner */
        .banner{background:var(--ink);color:var(--bg);padding:48px;display:grid;grid-template-columns:1.5fr auto;gap:32px;align-items:center;border:1px solid var(--ink)}
        .banner h3{margin:0;font-size:36px;font-family:"Archivo Narrow",sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:-.01em}
        .banner p{margin:8px 0 0;color:#bbb;font-size:14.5px;max-width:520px}

        /* search bar */
        .search-bar{background:#fff;border:1px solid var(--line);display:flex;gap:4px;padding:6px;margin-top:36px;max-width:650px;align-items: center;}
        .search-bar input{border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;padding:8px 12px;color:var(--ink);flex:1}
        .search-bar input::placeholder{color:var(--ink-4)}
        .search-sep{width:1px;background:var(--line);margin:4px 0}

        /* compare */
        .compare-table{width:100%;border-collapse:collapse;font-size:14px}
        .compare-table thead th{padding:24px 20px;text-align:center;border-bottom:1px solid var(--line);vertical-align:bottom;position:sticky;top:64px;background:var(--bg);z-index:5}
        .compare-table thead th:first-child{text-align:left}
        .compare-col-name{font-family:"Archivo Narrow",sans-serif;font-weight:700;text-transform:uppercase;font-size:22px;letter-spacing:.01em;line-height:1}
        .compare-col-tag{display:inline-block;margin-bottom:14px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;padding:4px 10px;border:1px solid var(--line);color:var(--ink-3)}
        .compare-col-recommended .compare-col-tag{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
        .compare-price{font-family:"Archivo",sans-serif;font-weight:800;font-size:36px;margin-top:14px;line-height:1;letter-spacing:-.02em}
        .compare-price-sub{font-size:11px;color:var(--ink-3);margin-top:4px;font-family:"JetBrains Mono",monospace}
        .compare-cta{margin-top:18px}
        .compare-row-head{background:var(--bg-soft)}
        .compare-row-head td{padding:14px 20px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
        .compare-table td{padding:18px 20px;border-bottom:1px solid var(--line-2);vertical-align:top}
        .compare-table td.feat{color:var(--ink-2);font-weight:500;width:32%}
        .compare-table td.cell{text-align:center}
        .compare-col-recommended .check{background:var(--accent);color:var(--on-accent)}

        /* dark card */
        .dark-card{background:var(--bg-dark);color:#f4f4f2;padding:88px 64px;text-align:center;border:1px solid var(--line)}
        .dark-card h2{font-size:clamp(40px,5.5vw,80px);margin:0 auto;max-width:14ch}
        .dark-card p{color:#bbb;font-size:15px;max-width:560px;margin:18px auto 0}
        .dark-pillrow{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:32px}
        .dark-pill{border:1px solid rgba(255,255,255,.18);color:#ddd;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:8px 14px}

        /* footer */
        .l-foot{padding:64px 0 28px;border-top:1px solid var(--line)}
        .foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
        .foot-col h4{margin:0 0 14px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);font-weight:500}
        .foot-col a{display:block;padding:5px 0;color:var(--ink-2);text-decoration:none;font-size:13.5px}
        .foot-col a:hover{color:var(--ink)}
        .foot-bottom{border-top:1px solid var(--line);padding-top:24px;display:flex;justify-content:space-between;align-items:center;color:var(--ink-3);font-size:12px}
        .foot-bottom a{color:inherit;text-decoration:none}
        .foot-bottom a:hover{color:var(--ink)}

        /* responsive */
        @media(max-width:980px){
          .hero-grid{grid-template-columns:1fr;gap:32px;padding:64px 0}
          .section-head{grid-template-columns:1fr;gap:16px}
          .cat-grid{grid-template-columns:repeat(2,1fr)}
          .pros-grid{grid-template-columns:1fr}
          .banner{grid-template-columns:1fr;gap:20px}
          .foot-grid{grid-template-columns:1fr 1fr}
          .l-nav-links{display:none}
        }
        @media(max-width:640px){
          .cat-grid{grid-template-columns:1fr}
          .hero-stats{grid-template-columns:1fr 1fr}
        }
      `}</style>


      <PublicNavbar />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: 24 }}></div>
              <h1 className="hero-h1 display">
                Sport.<br />
                Nutrition.<br />
                <span style={{ color: 'var(--accent)' }}>Bien-être.</span>
              </h1>
              <p className="hero-sub">
                Les meilleurs professionnels certifiés, disponibles à la séance ou sur abonnement. Sans engagement.
              </p>
              <div className="hero-meta">
                <Link to="/search" className="btn btn-primary btn-lg">Trouver un coach <IcArrow size={16} /></Link>
                <a href="#compare" className="btn btn-ghost btn-lg">Offre entreprise</a>
              </div>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="search-bar">
                <IcSearch size={16} style={{ color: 'var(--ink-4)', flexShrink: 0, alignSelf: 'center', marginLeft: 8 }} />
                <input type="text" placeholder="Sport, nutrition, yoga..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <div className="search-sep" />
                <IcMapPin size={16} style={{ color: 'var(--ink-4)', flexShrink: 0, alignSelf: 'center' }} />
                <input type="text" placeholder="Ville" value={searchCity} onChange={e => setSearchCity(e.target.value)} style={{ width: 90 }} />
                <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: 4 }}>Rechercher</button>
              </form>

              <div className="hero-stats">
                <div>
                  <div className="stat-num num">2 400+</div>
                  <div className="stat-label">Professionnels actifs</div>
                </div>
                <div>
                  <div className="stat-num num">45k</div>
                  <div className="stat-label">Séances réalisées</div>
                </div>
                <div>
                  <div className="stat-num num">4.8<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>/5</span></div>
                  <div className="stat-label">Note moyenne</div>
                </div>
              </div>
            </div>

            <div className="hero-media">
              <HumanBody3D
                width="100%"
                height="100%"
                background="transparent"
                wireColor={0x1e40af}
                fillOpacity={0.08}
                showPoints={true}
                showMeridians={true}
                autoRotate={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────────── */}
      <div className="ticker">
        <div className="ticker-track">
          {['Force', 'Endurance', 'HIIT', 'Yoga', 'Mobilité', 'Nutrition', 'Sommeil', 'Récupération', 'Méditation', 'Cardio', 'Pilates', 'Stretching',
            'Force', 'Endurance', 'HIIT', 'Yoga', 'Mobilité', 'Nutrition', 'Sommeil', 'Récupération', 'Méditation', 'Cardio', 'Pilates', 'Stretching',
          ].map((it, i) => <div className="ticker-item" key={i}>{it}</div>)}
        </div>
      </div>

      {/* ── CATEGORIES ──────────────────────────────────────────── */}
      <section className="l-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}></div>
              <h2 className="display">Pilotez<br />votre santé.</h2>
            </div>
            <p className="lede">Une plateforme, quatre piliers de la performance et du bien-être quotidien. Choisissez le vôtre, ou combinez-les.</p>
          </div>
          <div className="cat-grid">
            {[
              { n: '01', t: 'Sport', d: 'Coachs certifiés, programmes sur-mesure, suivi.', I: IcRun, q: 'sport' },
              { n: '02', t: 'Nutrition', d: 'Diététiciens, plans repas, micro-nutrition.', I: IcLeaf, q: 'nutrition' },
              { n: '03', t: 'Mental', d: 'Préparateurs mentaux, sophrologie, coaching.', I: IcBrain, q: 'mental' },
              { n: '04', t: 'Bien-être', d: 'Kiné, ostéo, massage sportif, récupération.', I: IcSpark, q: 'bienetre' },
            ].map(c => (
              <Link key={c.t} to={`/search?q=${c.q}`} className="cat">
                <div className="cat-num">{c.n} / 04</div>
                <div className="cat-icon"><c.I size={24} stroke={1.5} /></div>
                <div className="cat-title">{c.t}</div>
                <div className="cat-desc">{c.d}</div>
                <div className="cat-arrow"><IcArrow size={14} /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROS ────────────────────────────────────────────────── */}
      <section className="l-section" id="particuliers">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}></div>
              <h2 className="display">Nos professionnels.</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {['Tous', 'Sport', 'Nutrition', 'Mental', 'Bien-être'].map(label => (
                <Link key={label} to={label === 'Tous' ? '/search' : `/search?q=${label.toLowerCase()}`} className="btn btn-ghost btn-sm">{label}</Link>
              ))}
            </div>
          </div>

          <div className="pros-grid">
            {(coaches.length === 0 ? Array(6).fill(null) : coaches).map((coach, i) => {
              if (!coach) return (
                <div key={i} className="pro-card">
                  <div className="pro-avatar" style={{ background: 'var(--bg-soft)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '60%', background: 'var(--bg-soft)', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 12, width: '40%', background: 'var(--bg-soft)', borderRadius: 4 }} />
                  </div>
                </div>
              );
              const specialty = coach.profile?.specialties?.[0]
                ? CATEGORY_LABELS[coach.profile.specialties[0]] || coach.profile.specialties[0]
                : null;
              const avatarSrc = coach.avatarUrl || (coach.gender === 'FEMME' ? avatarFemale : avatarMale);
              return (
                <Link key={coach.id} to={`/coaches/${coach.id}`} className="pro-card">
                  <div className="pro-avatar">
                    <img src={avatarSrc} alt={coach.firstName} />
                  </div>
                  <div className="pro-info">
                    <div className="pro-name">{coach.firstName} {coach.lastName}</div>
                    {specialty && <div className="pro-role">{specialty}</div>}
                    {coach.profile?.city && (
                      <div className="pro-role" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <IcMapPin size={11} /> {coach.profile.city}
                      </div>
                    )}
                    <div className="pro-stats">
                      {coach.averageRating != null && <span><strong>★ {Number(coach.averageRating).toFixed(1)}</strong></span>}
                      {coach.reviewCount > 0 && <span><strong>{coach.reviewCount}</strong> avis</span>}
                      {coach.sessionsDone > 0 && <span><strong>{coach.sessionsDone}</strong> séances</span>}
                      {!coach.averageRating && !coach.sessionsDone && <span>Nouveau</span>}
                    </div>
                    {specialty && <div className="pro-pill">{specialty}</div>}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="banner" style={{ marginTop: 48 }}>
            <div>
              <h3>Réservez votre séance.</h3>
              <p>Prenez rendez-vous en 60 secondes avec le pro qui correspond à votre objectif. Sans abonnement — à partir de 40€.</p>
            </div>
            <Link to="/search" className="btn btn-on-dark btn-lg">Trouver un pro <IcArrow size={16} /></Link>
          </div>
        </div>
      </section>

      {/* ── COMPARE TABLE ───────────────────────────────────────── */}
      <section className="l-section" id="compare" style={{ paddingBottom: 96 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}></div>
              <h2 className="display">Comparez les abonnements.</h2>
            </div>
            <div>
              <p className="lede" style={{ marginBottom: 20 }}>Pas de frais cachés. Annulation à tout moment. Le bon plan, c'est celui qui colle à votre objectif.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: !isYearly ? 'var(--ink)' : 'var(--ink-3)' }}>Mensuel</span>
                <button
                  onClick={() => setBillingCycle(isYearly ? 'monthly' : 'yearly')}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isYearly ? 'var(--accent)' : '#ddd', position: 'relative', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: 2, left: isYearly ? 22 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'left .25s' }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: isYearly ? 'var(--ink)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Annuel {isYearly && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: '"JetBrains Mono", monospace' }}>-20%</span>}
                </span>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {ENTERPRISE_PLANS.map(p => {
                    const price = isYearly ? p.priceYearly : p.priceMonthly;
                    return (
                      <th key={p.id} className={p.reco ? 'compare-col-recommended' : ''}>
                        <div className="compare-col-tag">{p.tag}</div>
                        <div className="compare-col-name">{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 4 }}>{p.desc}</div>
                        <div className="compare-price num">{price}€</div>
                        <div className="compare-price-sub">/ mois{isYearly ? ` · facturé ${price * 12}€/an` : ''}</div>
                        <div className="compare-cta">
                          <Link to="/register?role=ENTREPRISE" className={'btn btn-block ' + (p.reco ? 'btn-accent' : 'btn-primary')}>
                            {p.cta}
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARE_SECTIONS.map((s, si) => (
                  <Fragment key={si}>
                    <tr className="compare-row-head">
                      <td colSpan={4}>{`/ ${String(si + 1).padStart(2, '0')} — ${s.head}`}</td>
                    </tr>
                    {s.rows.map((r, ri) => (
                      <tr key={`${si}-${ri}`}>
                        <td className="feat">{r[0]}</td>
                        <td className="cell">{tableCell(r[1])}</td>
                        <td className="cell" style={recoCellStyle}>{tableCell(r[2])}</td>
                        <td className="cell">{tableCell(r[3])}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--ink-3)', fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}>
            Prix HT · Engagement minimum 10 mois · TVA incluse.
          </div>
        </div>
      </section>

      {/* ── DEV YOUR ACTIVITY ───────────────────────────────────── */}
      <section className="l-section">
        <div className="container">
          <div className="dark-card">
            <div className="eyebrow" style={{ marginBottom: 18, color: '#999' }}></div>
            <h2 className="display">Développez votre activité.</h2>
            <p>Coachs, diététiciens, kinés, préparateurs mentaux : rejoignez Goupyl, gérez vos clients, encaissez en un clic. <strong style={{ color: '#fff' }}>70% reversés</strong> à chaque séance.</p>
            <div className="dark-pillrow">
              {['Agenda', 'Paiements', 'Séances live', 'Programmes', 'Facturation', 'Avis clients'].map(pill => (
                <span key={pill} className="dark-pill">{pill}</span>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <Link to="/register?role=INTERVENANT" className="btn btn-on-dark btn-lg">Devenir pro <IcArrow size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="l-section">
        <div className="container" style={{ maxWidth: 880 }}>
          <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 14 }}></div>
          <h2 className="display" style={{ textAlign: 'center', fontSize: 'clamp(40px,5vw,72px)', marginBottom: 48 }}>Questions fréquentes.</h2>
          {FAQS.map((faq, i) => (
            <FaqItem key={i} q={faq[0]} a={faq[1]} n={i + 1} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
          <div style={{ borderTop: '1px solid var(--line)' }} />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="l-foot">
        <div className="container">
          <div className="foot-grid">
            <div>
              <img src={logo} alt="Goupyl Sport" className="w-55 h-auto ml-[-18px]" />
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5, maxWidth: 280, marginTop: 4 }}>
                Sport. Nutrition. Bien-être. La plateforme qui réunit les meilleurs pros, à la séance ou sur abonnement.
              </p>
            </div>
            <div className="foot-col">
              <h4>Domaines</h4>
              <Link to="/search?q=sport">Sport</Link>
              <Link to="/search?q=nutrition">Nutrition</Link>
              <Link to="/search?q=mental">Mental</Link>
              <Link to="/search?q=bienetre">Bien-être</Link>
            </div>
            <div className="foot-col">
              <h4>Entreprise</h4>
              <a href="#compare">Zen</a>
              <a href="#compare">Pulse</a>
              <a href="#compare">Boost</a>
              <Link to="/register?role=ENTREPRISE">Commencer</Link>
            </div>
            <div className="foot-col">
              <h4>Légal</h4>
              <Link to="/cgu">CGU</Link>
              <Link to="/confidentialite">Confidentialité</Link>
              <a href="mailto:contact@goupylsport.fr">Contact</a>
            </div>
          </div>
          <div className="foot-bottom">
            <div>© 2026 Goupyl Sport SAS — Tous droits réservés.</div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Link to="/confidentialite">Confidentialité</Link>
              <Link to="/cgu">CGU</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
