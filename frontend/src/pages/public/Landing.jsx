import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/layout/PublicNavbar';
import logo from '../../assets/logo-goupyl-sport.png';
import HumanBody3D from "../../components/layout/body.jsx";

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
const IcBuilding = (p) => <Icon {...p} d={<><path d="M3 21h18" /><path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" /><path d="M9 8h1" /><path d="M14 8h1" /><path d="M9 12h1" /><path d="M14 12h1" /><path d="M9 16h1" /><path d="M14 16h1" /></>} />;
const IcUsers = (p) => <Icon {...p} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>} />;
const IcShield = (p) => <Icon {...p} d={<path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6l9-4z" />} />;
const IcZap = (p) => <Icon {...p} d={<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />} />;
const IcChart = (p) => <Icon {...p} d={<><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" /></>} />;

// ─── Enterprise plans ──────────────────────────────────────────────
const ENTERPRISE_PLANS = [
  {
    id: 'zen', tag: 'Entrée', name: 'Essentiel',
    priceMonthly: 54, priceYearly: 43,
    desc: "Jusqu'à 10 collaborateurs",
    cta: 'Demander une démo',
    features: [
      'Remise en activité physique',
      'Contenus santé & bien-être',
      'Suivi basique de l\'engagement',
      'Support email',
    ],
  },
  {
    id: 'pulse', tag: 'Recommandé', name: 'Boost',
    priceMonthly: 122, priceYearly: 98,
    desc: "Jusqu'à 50 collaborateurs",
    cta: 'Demander une démo', reco: true,
    features: [
      'Coaching sportif structuré',
      'Suivi nutritionnel',
      'Plans personnalisés & progression',
      'Account manager dédié',
    ],
  },
  {
    id: 'boost', tag: 'Haut de gamme', name: 'Ultra',
    priceMonthly: null, priceYearly: null,
    desc: "Jusqu'à 200 collaborateurs",
    cta: 'Parler à un expert',
    features: [
      'Nutrition individualisée',
      'Accompagnement mental',
      'Tests à l\'effort & biomarqueurs',
      'SLA garanti & conseiller dédié',
    ],
  },
];

const COMPARE_SECTIONS = [
  {
    head: 'Accompagnement', rows: [
      ['Professionnels certifiés', true, true, true],
      ['Séances / collaborateur / semaine', '1', '2', '4'],
      ['Tous les domaines sport-santé', false, true, true],
      ['Suivi nutritionnel', false, true, true],
      ['Préparation mentale', false, false, true],
      ['Tests à l\'effort & biomarqueurs', false, false, true],
    ]
  },
  {
    head: 'Application & data', rows: [
      ['App iOS & Android', true, true, true],
      ['Suivi des performances', 'Basique', 'Avancé', 'Avancé'],
      ['Reporting RH mensuel', false, true, true],
      ['Export de données agrégées', false, false, true],
      ['API & intégration SIRH', false, false, true],
    ]
  },
  {
    head: 'Gestion entreprise', rows: [
      ['Kit de lancement & communication', true, true, true],
      ['Collaborateurs inclus', '10', '50', '200'],
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
  ["Comment fonctionne l'offre entreprise ?", "Vous souscrivez un abonnement mensuel ou annuel par collaborateur. Une fois le contrat signé, nous vous livrons un kit de lancement et un code d'invitation à diffuser en interne. Vos collaborateurs créent leur compte en quelques minutes et accèdent immédiatement à nos professionnels certifiés."],
  ["Les professionnels sont-ils certifiés ?", "Oui. Chaque intervenant soumet ses diplômes et certifications lors de son inscription. Notre équipe vérifie chaque dossier avant l'activation du profil. Nos coachs sportifs, diététiciens et préparateurs mentaux sont tous diplômés et expérimentés."],
  ["Puis-je changer de plan ?", "Oui, à tout moment. Le prorata est calculé automatiquement lors d'un upgrade. Vous pouvez aussi ajuster le nombre de collaborateurs à chaque échéance. Annulation possible après l'engagement minimum, sans frais cachés."],
  ["Comment mes collaborateurs accèdent-ils à la plateforme ?", "Chaque collaborateur reçoit un code d'invitation unique (par email, intranet ou QR code). Il crée son compte en 2 minutes, réalise un bilan initial, puis accède à son plan personnalisé et à son tableau de bord de progression sur web et mobile."],
  ["Nos données RH sont-elles protégées ?", "Absolument. Goupyl Sport est conforme RGPD. Vos données RH et celles de vos collaborateurs sont chiffrées et hébergées en Europe. Les tableaux de bord entreprise ne présentent que des données agrégées et anonymisées — aucune information individuelle n'est partagée avec l'employeur."],
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
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(0);
  const [demoSent, setDemoSent] = useState(false);
  const [demoForm, setDemoForm] = useState({
    company: '', name: '', email: '', phone: '', size: '', message: '',
  });

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@400;500;600;700;800&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

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

  const handleDemoChange = (k) => (e) => setDemoForm({ ...demoForm, [k]: e.target.value });
  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSent(true);
  };

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

        html{scroll-behavior:smooth}

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
        .hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:64px;padding:96px 0 80px;align-items:center}
        .hero-h1{margin:0;font-size:clamp(52px,7.6vw,116px)}
        .hero-sub{margin-top:28px;max-width:560px;font-size:17px;line-height:1.5;color:var(--ink-2)}
        .hero-meta{margin-top:36px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .hero-stats{margin-top:56px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);padding-top:24px;gap:24px}
        .stat-num{font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1;font-family:"Archivo Narrow",sans-serif;text-transform:uppercase}
        .stat-label{font-size:12px;color:var(--ink-3);margin-top:6px}

        /* hero visual */
        .hero-visual{position:relative;aspect-ratio:4/5;min-height:480px;background:var(--ink);overflow:hidden;border:1px solid var(--ink)}
        .hero-visual-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:32px 32px}
        .hero-visual-blob{position:absolute;width:420px;height:420px;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 30% 30%,var(--accent),transparent 70%);filter:blur(40px);opacity:.7;animation:floaty 8s ease-in-out infinite}
        @keyframes floaty{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-58%) scale(1.06)}}
        .hero-visual-tag{position:absolute;left:20px;top:20px;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;background:#fff;color:var(--ink);padding:6px 10px}
        .hero-visual-rings{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
        .hero-visual-ring{position:absolute;border:1px solid rgba(255,255,255,.10);border-radius:50%}
        .hero-pill-stack{position:absolute;left:24px;bottom:24px;display:flex;flex-direction:column;gap:8px}
        .hero-pill{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#fff;padding:8px 12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);backdrop-filter:blur(4px);width:max-content}
        .hero-badge{position:absolute;right:20px;bottom:20px;border:1px solid #fff;background:var(--ink);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;min-width:200px}
        .hero-badge-dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(37,45,98,.35)}
        .hero-badge-num{font-family:"Archivo",sans-serif;font-weight:800;font-size:22px;line-height:1}
        .hero-badge-label{font-size:10px;color:#aaa;letter-spacing:.14em;text-transform:uppercase;margin-top:4px}

        /* ticker */
        .ticker{border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden;background:var(--bg)}
        .ticker-track{display:flex;gap:64px;padding:18px 0;animation:tick 38s linear infinite;width:max-content}
        .ticker-item{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:64px;white-space:nowrap}
        .ticker-item::after{content:"●";color:var(--accent);font-size:8px}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        /* usages — asymmetric contrast split */
        .usage-split{display:grid;grid-template-columns:1.04fr .96fr;border:1px solid var(--ink)}
        .upanel{position:relative;padding:52px 46px;display:flex;flex-direction:column;overflow:hidden;isolation:isolate}
        .upanel--dark{background:var(--ink);color:var(--bg)}
        .upanel--light{background:var(--bg);color:var(--ink);border-left:1px solid var(--ink)}
        .upanel-ghost{position:absolute;top:-28px;right:14px;font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:210px;line-height:1;letter-spacing:-.05em;z-index:-1;pointer-events:none;user-select:none}
        .upanel--dark .upanel-ghost{color:rgba(255,255,255,.05)}
        .upanel--light .upanel-ghost{color:rgba(0,0,0,.045)}
        .upanel-kicker{display:flex;align-items:center;gap:12px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.65}
        .upanel-kicker::before{content:"";width:26px;height:1px;background:currentColor;opacity:.5}
        .upanel-icon{width:52px;height:52px;margin:28px 0 22px;border:1px solid currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:.9}
        .upanel-title{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:clamp(34px,3.4vw,46px);text-transform:uppercase;letter-spacing:-.015em;line-height:.96}
        .upanel-sub{font-size:14.5px;margin-top:10px;opacity:.6;max-width:360px}
        .upanel-list{margin-top:32px;list-style:none;padding:0}
        .upanel-list li{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;font-size:14.5px;line-height:1.45;padding:15px 0;border-top:1px solid currentColor}
        .upanel--dark .upanel-list li{border-color:rgba(255,255,255,.13)}
        .upanel--light .upanel-list li{border-color:var(--line)}
        .upanel-list li:last-child{border-bottom:1px solid currentColor}
        .upanel--dark .upanel-list li:last-child{border-bottom-color:rgba(255,255,255,.13)}
        .upanel--light .upanel-list li:last-child{border-bottom-color:var(--line)}
        .upanel-list .li-idx{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.06em;padding-top:2px;opacity:.45}

        /* process — swimlane timeline */
        .process{display:flex;flex-direction:column}
        .process-lane{display:grid;grid-template-columns:minmax(150px,.72fr) repeat(4,1fr)}
        .process-lane + .process-lane{margin-top:40px}
        .process-rowlabel{padding:24px 28px 24px 0;display:flex;flex-direction:column;justify-content:center}
        .process-lane-name{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:26px;text-transform:uppercase;letter-spacing:-.01em;line-height:1}
        .process-lane-sub{font-size:12.5px;color:var(--ink-3);margin-top:8px;max-width:210px;line-height:1.4}
        .process-cell{position:relative;padding:30px 22px 28px;border-top:1px solid var(--line);transition:background .2s}
        .process-cell + .process-cell{border-left:1px solid var(--line-2)}
        .process-cell:hover{background:var(--bg-soft)}
        .process-node{position:absolute;top:-5px;left:22px;width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--bg)}
        .process-step{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;color:var(--accent);display:block;margin-bottom:14px}
        .process-cell-title{font-weight:600;font-size:15px;margin-bottom:6px}
        .process-cell-desc{font-size:13px;color:var(--ink-3);line-height:1.5}

        /* profiles */
        .prof-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line)}
        .prof{position:relative;background:var(--bg);padding:34px 30px 30px;display:flex;flex-direction:column;min-height:264px;transition:background .2s}
        .prof + .prof{border-left:1px solid var(--line)}
        .prof:hover{background:var(--bg-soft)}
        .prof::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--accent);transform:scaleY(0);transform-origin:top;transition:transform .3s}
        .prof:hover::before{transform:scaleY(1)}
        .prof-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:24px}
        .prof-tag{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-4)}
        .prof-idx{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:13px;color:var(--ink-4);line-height:1}
        .prof-mark{width:38px;height:38px;border:1px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ink);flex-shrink:0}
        .prof-title{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:clamp(26px,2.4vw,32px);text-transform:uppercase;letter-spacing:-.01em;line-height:.98}
        .prof-desc{font-size:13.5px;color:var(--ink-3);margin-top:14px;flex:1;line-height:1.5}
        .prof-foot{margin-top:22px;padding-top:16px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.04em;color:var(--ink-2)}
        .prof-foot .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);flex-shrink:0}

        /* proof / stat cards */
        .proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:48px}
        .proof{background:var(--bg);padding:36px 32px;min-height:200px;display:flex;flex-direction:column;justify-content:space-between}
        .proof-icon{width:48px;height:48px;border:1px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px}
        .proof-num{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:42px;text-transform:uppercase;letter-spacing:-.01em;line-height:1}
        .proof-label{font-size:13px;color:var(--ink-3);margin-top:8px}
        .quote{background:var(--ink);color:var(--bg);padding:48px;border:1px solid var(--ink);display:grid;grid-template-columns:auto 1fr;gap:32px;align-items:center}
        .quote-mark{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:120px;color:var(--accent);line-height:.8;align-self:flex-start}
        .quote-text{font-family:"Archivo Narrow",sans-serif;font-weight:500;font-size:24px;line-height:1.3;letter-spacing:-.01em}
        .quote-author{margin-top:18px;display:flex;align-items:center;gap:14px}
        .quote-author-name{font-weight:600;font-size:14px}
        .quote-author-role{font-size:12px;color:#999;margin-top:2px}

        /* compare */
        .compare-table{width:100%;border-collapse:collapse;font-size:14px}
        .compare-table thead th{padding:24px 20px;text-align:center;border-bottom:1px solid var(--line);vertical-align:bottom;position:sticky;top:64px;background:var(--bg);z-index:5}
        .compare-table thead th:first-child{text-align:left}
        .compare-col-name{font-family:"Archivo Narrow",sans-serif;font-weight:700;text-transform:uppercase;font-size:22px;letter-spacing:.01em;line-height:1}
        .compare-col-tag{display:inline-block;margin-bottom:14px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;padding:4px 10px;border:1px solid var(--line);color:var(--ink-3)}
        .compare-col-recommended .compare-col-tag{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
        .compare-price{font-family:"Archivo",sans-serif;font-weight:800;font-size:32px;margin-top:14px;line-height:1;letter-spacing:-.02em}
        .compare-price-sub{font-size:11px;color:var(--ink-3);margin-top:4px;font-family:"JetBrains Mono",monospace}
        .compare-cta{margin-top:18px}
        .compare-row-head{background:var(--bg-soft)}
        .compare-row-head td{padding:14px 20px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
        .compare-table td{padding:18px 20px;border-bottom:1px solid var(--line-2);vertical-align:top}
        .compare-table td.feat{color:var(--ink-2);font-weight:500;width:32%}
        .compare-table td.cell{text-align:center}
        .compare-col-recommended .check{background:var(--accent);color:var(--on-accent)}

        /* pricing cards */
        .price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:64px}
        .price-card{background:var(--bg);border:1px solid var(--line);padding:32px 28px;display:flex;flex-direction:column;position:relative}
        .price-card.reco{border-color:var(--ink);background:#fff}
        .price-tag{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;padding:4px 10px;border:1px solid var(--line);color:var(--ink-3);margin-bottom:18px;align-self:flex-start}
        .price-card.reco .price-tag{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
        .price-name{font-family:"Archivo Narrow",sans-serif;font-weight:700;font-size:38px;text-transform:uppercase;letter-spacing:-.01em;line-height:1}
        .price-desc{font-size:13px;color:var(--ink-3);margin-top:8px}
        .price-amount{margin-top:24px;font-family:"Archivo",sans-serif;font-weight:800;font-size:42px;letter-spacing:-.02em;line-height:1}
        .price-amount-sub{font-size:12px;color:var(--ink-3);margin-top:6px;font-family:"JetBrains Mono",monospace}
        .price-features{list-style:none;padding:0;margin:28px 0 24px;display:flex;flex-direction:column;gap:12px;flex:1}
        .price-features li{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:var(--ink-2)}
        .price-features li svg{flex-shrink:0;margin-top:3px;color:var(--accent)}

        /* dark card */
        .dark-card{background:var(--bg-dark);color:#f4f4f2;padding:88px 64px;text-align:center;border:1px solid var(--line)}
        .dark-card h2{font-size:clamp(40px,5.5vw,80px);margin:0 auto;max-width:14ch}
        .dark-card p{color:#bbb;font-size:15px;max-width:560px;margin:18px auto 0}

        /* demo form */
        .demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}
        .demo-info h2{font-size:clamp(40px,5vw,72px);margin:0 0 24px}
        .demo-info p{color:var(--ink-2);font-size:16px;max-width:480px;margin-bottom:32px}
        .demo-bullet{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--line);font-size:14.5px}
        .demo-bullet:last-child{border-bottom:1px solid var(--line)}
        .demo-bullet svg{color:var(--accent);flex-shrink:0}
        .demo-form{background:#fff;border:1px solid var(--line);padding:32px}
        .demo-form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .demo-field{margin-bottom:18px;display:flex;flex-direction:column}
        .demo-field label{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-bottom:8px}
        .demo-field input,.demo-field select,.demo-field textarea{border:1px solid var(--line);background:var(--bg);padding:12px 14px;font-family:inherit;font-size:14px;color:var(--ink);outline:none;transition:border-color .15s}
        .demo-field input:focus,.demo-field select:focus,.demo-field textarea:focus{border-color:var(--ink)}
        .demo-field textarea{resize:vertical;min-height:96px;font-family:inherit}
        .demo-success{background:#fff;border:1px solid var(--line);padding:48px;text-align:center}
        .demo-success-icon{width:64px;height:64px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}

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
          .usage-split{grid-template-columns:1fr}
          .upanel--light{border-left:none;border-top:1px solid var(--ink)}
          .upanel{padding:40px 28px}
          .upanel-ghost{font-size:150px}
          .process-lane{grid-template-columns:1fr}
          .process-lane + .process-lane{margin-top:24px}
          .process-rowlabel{padding:0 0 8px}
          .process-cell + .process-cell{border-left:none}
          .prof-grid{grid-template-columns:1fr}
          .prof + .prof{border-left:none;border-top:1px solid var(--line)}
          .proof-grid{grid-template-columns:1fr}
          .price-grid{grid-template-columns:1fr}
          .quote{grid-template-columns:1fr;gap:20px;padding:32px}
          .quote-mark{font-size:80px}
          .quote-text{font-size:20px}
          .demo-grid{grid-template-columns:1fr;gap:32px}
          .foot-grid{grid-template-columns:1fr 1fr}
        }
        @media(max-width:640px){
          .hero-stats{grid-template-columns:1fr 1fr}
          .demo-form-row{grid-template-columns:1fr}
        }
      `}</style>


      <PublicNavbar />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section id="hero" style={{ borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: 24 }}>Plateforme B2B · Sport-santé en entreprise</div>
              <h1 className="hero-h1 display">
                Pilotez<br />
                <span style={{ color: 'var(--accent)' }}>votre santé.</span>
              </h1>
              <p className="hero-sub">
                Offrez à vos équipes un accompagnement complet par des professionnels certifiés : sport, nutrition, mental. Une plateforme, trois domaines, un seul abonnement.
              </p>
              <div className="hero-meta">
                <a href="#demo" className="btn btn-primary btn-lg">Demander une démo <IcArrow size={16} /></a>
                <a href="#offres" className="btn btn-ghost btn-lg">Voir les offres</a>
              </div>

              <div className="hero-stats">
                <div>
                  <div className="stat-num">48 h</div>
                  <div className="stat-label">Déploiement</div>
                </div>
                <div>
                  <div className="stat-num">100%</div>
                  <div className="stat-label">Pros certifiés</div>
                </div>
                <div>
                  <div className="stat-num">3</div>
                  <div className="stat-label">Domaines couverts</div>
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
          {['Sport en entreprise', 'QVCT', 'Nutrition', 'Mental', 'RH', 'Bien-être', 'CSE', 'Performance', 'Engagement', 'Prévention',
            'Sport en entreprise', 'QVCT', 'Nutrition', 'Mental', 'RH', 'Bien-être', 'CSE', 'Performance', 'Engagement', 'Prévention',
          ].map((it, i) => <div className="ticker-item" key={i}>{it}</div>)}
        </div>
      </div>

      {/* ── DEUX PARCOURS ───────────────────────────────────────── */}
      <section className="l-section" id="parcours">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Deux parcours</div>
              <h2 className="display">Un projet,<br />deux usages.</h2>
            </div>
            <p className="lede">Goupyl Sport s'adresse autant aux décideurs qu'aux collaborateurs. Chaque audience trouve sa réponse, dans une seule plateforme.</p>
          </div>

          <div className="usage-split">
            <div className="upanel upanel--dark">
              <span className="upanel-ghost">01</span>
              <div className="upanel-kicker">Décideur</div>
              <div className="upanel-icon"><IcBuilding size={24} stroke={1.5} /></div>
              <div className="upanel-title">DRH, Dirigeant,<br />CSE.</div>
              <div className="upanel-sub">Pilotez la santé et la performance de vos équipes.</div>
              <ul className="upanel-list">
                {[
                  'Pourquoi déployer : prévention, attractivité, fidélisation.',
                  'ROI mesurable : engagement, absentéisme, satisfaction.',
                  'Pilotage simple : tableau de bord RH agrégé et anonymisé.',
                  'Renouvellement transparent : périmètre ajusté à chaque échéance.',
                ].map((t, i) => (
                  <li key={i}><span className="li-idx">{String(i + 1).padStart(2, '0')}</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
            <div className="upanel upanel--light">
              <span className="upanel-ghost">02</span>
              <div className="upanel-kicker">Collaborateur</div>
              <div className="upanel-icon"><IcUsers size={24} stroke={1.5} /></div>
              <div className="upanel-title">Salarié,<br />équipier.</div>
              <div className="upanel-sub">Un accompagnement sur-mesure, à votre rythme.</div>
              <ul className="upanel-list">
                {[
                  "Accès en 2 minutes avec un code d'invitation entreprise.",
                  'Tout au même endroit : coachs, diététiciens, préparateurs mentaux.',
                  'Plan personnalisé, séances en visio ou en présentiel, suivi continu.',
                  'Progression visible : objectifs, bilans, historique.',
                ].map((t, i) => (
                  <li key={i}><span className="li-idx">{String(i + 1).padStart(2, '0')}</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMENT CA MARCHE ───────────────────────────────────── */}
      <section className="l-section" id="comment-ca-marche">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Onboarding</div>
              <h2 className="display">Comment<br />ça marche.</h2>
            </div>
            <p className="lede">Deux parcours d'onboarding pensés pour fluidifier le déploiement côté entreprise, et l'engagement côté collaborateurs.</p>
          </div>

          <div className="process">
            {[
              {
                name: 'Entreprise',
                sub: 'Du contrat aux premiers résultats, en moins de deux semaines.',
                steps: [
                  { t: 'Contractualisation', d: 'Choix de l\'offre, signature en ligne, configuration du compte.' },
                  { t: 'Kit de lancement', d: 'Codes d\'invitation, supports de communication interne, FAQ.' },
                  { t: 'Communication interne', d: 'Annonce coordonnée : email, intranet, affichage.' },
                  { t: 'Premiers résultats', d: 'Tableau de bord RH actif, bilans, indicateurs d\'engagement.' },
                ],
              },
              {
                name: 'Collaborateur',
                sub: 'Du code d\'invitation au premier rendez-vous, en quelques minutes.',
                steps: [
                  { t: 'Inscription par code', d: 'Création du compte via le code entreprise reçu par email.' },
                  { t: 'Bilan initial', d: 'Questionnaire santé, objectifs, préférences. Confidentiel.' },
                  { t: 'Plan personnalisé', d: 'Professionnels adaptés, planification des séances.' },
                  { t: 'Suivi des résultats', d: 'Progression visible, ajustements, accès continu aux experts.' },
                ],
              },
            ].map((lane, li) => (
              <div className="process-lane" key={li}>
                <div className="process-rowlabel">
                  <span className="process-lane-name">{lane.name}</span>
                  <span className="process-lane-sub">{lane.sub}</span>
                </div>
                {lane.steps.map((s, i) => (
                  <div className="process-cell" key={i}>
                    <span className="process-node" />
                    <span className="process-step">{String(i + 1).padStart(2, '0')}</span>
                    <div className="process-cell-title">{s.t}</div>
                    <div className="process-cell-desc">{s.d}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POUR QUI ────────────────────────────────────────────── */}
      <section className="l-section" id="pour-qui">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Pour qui</div>
              <h2 className="display">Une réponse<br />pour chaque<br />organisation.</h2>
            </div>
            <p className="lede">Que vous soyez une PME en croissance ou un grand groupe, nous adaptons le déploiement à vos enjeux. Et chaque collaborateur trouve son parcours, du sédentaire au sportif aguerri.</p>
          </div>

          <div className="eyebrow" style={{ marginBottom: 14 }}>Par profil d'entreprise</div>
          <div className="prof-grid" style={{ marginBottom: 32 }}>
            {[
              { tag: 'PME · 10–50', title: 'PME', desc: "Outils clé en main, déploiement express, impact rapide sur la cohésion d'équipe.", foot: 'Essentiel ou Boost' },
              { tag: 'ETI · 50–500', title: 'ETI', desc: 'Reporting RH avancé, account manager dédié, communication interne pilotée.', foot: 'Boost' },
              { tag: 'Grand groupe · 500+', title: 'Grand groupe', desc: 'Intégration SIRH, SLA, accompagnement premium, programme multi-sites.', foot: 'Ultra' },
            ].map((s, i) => (
              <div className="prof" key={i}>
                <div className="prof-top">
                  <span className="prof-tag">{s.tag}</span>
                  <span className="prof-idx">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="prof-title">{s.title}</div>
                <div className="prof-desc">{s.desc}</div>
                <div className="prof-foot"><span className="dot" />Recommandé&nbsp;: {s.foot}</div>
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ marginBottom: 14 }}>Par profil de collaborateur</div>
          <div className="prof-grid">
            {[
              { Ic: IcLeaf, tag: 'Sédentaire', title: "Reprise d'activité", desc: 'Reprise en douceur, équilibre alimentaire, gestion du stress et du sommeil.', foot: 'Coachs en réathlétisation' },
              { Ic: IcRun, tag: 'Régulier', title: 'Sportif régulier', desc: "Plans d'entraînement structurés, nutrition adaptée, progression mesurée.", foot: 'Coachs sportifs & diététiciens' },
              { Ic: IcZap, tag: 'Performance', title: 'Haute performance', desc: "Préparation physique avancée, mental, tests à l'effort, suivi biomarqueurs.", foot: 'Préparateurs & médecins du sport' },
            ].map((s, i) => (
              <div className="prof" key={i}>
                <div className="prof-top">
                  <span className="prof-tag">{s.tag}</span>
                  <span className="prof-mark"><s.Ic size={18} stroke={1.5} /></span>
                </div>
                <div className="prof-title">{s.title}</div>
                <div className="prof-desc">{s.desc}</div>
                <div className="prof-foot"><span className="dot" />{s.foot}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OFFRES ──────────────────────────────────────────────── */}
      <section className="l-section" id="offres" style={{ paddingBottom: 96 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Trois paliers</div>
              <h2 className="display">Nos offres<br />entreprise.</h2>
            </div>
            <div>
              <p className="lede" style={{ marginBottom: 20 }}>Un abonnement par collaborateur. Engagement minimum 10 mois. -20% sur la facturation annuelle.</p>
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

          {/* Pricing cards */}
          <div className="price-grid">
            {ENTERPRISE_PLANS.map((p) => {
              const price = isYearly ? p.priceYearly : p.priceMonthly;
              return (
                <div key={p.id} className={'price-card' + (p.reco ? ' reco' : '')}>
                  <span className="price-tag">{p.tag}</span>
                  <div className="price-name">{p.name}</div>
                  <div className="price-desc">{p.desc}</div>
                  {price != null ? (
                    <>
                      <div className="price-amount num">{price}€</div>
                      <div className="price-amount-sub">/ collaborateur / mois{isYearly ? ` · facturé ${price * 12}€/an` : ''}</div>
                    </>
                  ) : (
                    <>
                      <div className="price-amount num">Sur devis</div>
                      <div className="price-amount-sub">Adapté à votre périmètre</div>
                    </>
                  )}
                  <ul className="price-features">
                    {p.features.map((f, i) => (
                      <li key={i}><IcCheck size={14} /> {f}</li>
                    ))}
                  </ul>
                  <a href="#demo" className={'btn btn-block ' + (p.reco ? 'btn-accent' : 'btn-primary')}>{p.cta}</a>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 48, color: 'var(--ink-3)', fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}>
            Prix HT · TVA 20% en sus · Engagement minimum 10 mois
          </div>

          {/* Comparison table */}
          <div className="eyebrow" style={{ marginBottom: 14, textAlign: 'center' }}>Comparer en détail</div>
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
                        {price != null ? (
                          <>
                            <div className="compare-price num">{price}€</div>
                            <div className="compare-price-sub">/ collab / mois</div>
                          </>
                        ) : (
                          <>
                            <div className="compare-price num">Sur devis</div>
                            <div className="compare-price-sub">Custom</div>
                          </>
                        )}
                        <div className="compare-cta">
                          <a href="#demo" className={'btn btn-block ' + (p.reco ? 'btn-accent' : 'btn-primary')}>
                            {p.cta}
                          </a>
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
        </div>
      </section>

      {/* ── PREUVES / RESSOURCES ────────────────────────────────── */}
      <section className="l-section" id="preuves">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Preuves</div>
              <h2 className="display">Ce qui<br />nous distingue.</h2>
            </div>
            <p className="lede">Une promesse claire, une exécution rigoureuse. Nos engagements de qualité et de conformité sont au cœur de la plateforme.</p>
          </div>

          <div className="proof-grid">
            <div className="proof">
              <div>
                <div className="proof-icon"><IcZap size={22} stroke={1.5} /></div>
                <div className="proof-num">48 h</div>
                <div className="proof-label">Déploiement complet de l'offre, du contrat aux premiers accès collaborateurs.</div>
              </div>
            </div>
            <div className="proof">
              <div>
                <div className="proof-icon"><IcShield size={22} stroke={1.5} /></div>
                <div className="proof-num">Certifiés</div>
                <div className="proof-label">Tous nos professionnels sont diplômés et leurs documents vérifiés un à un.</div>
              </div>
            </div>
            <div className="proof">
              <div>
                <div className="proof-icon"><IcChart size={22} stroke={1.5} /></div>
                <div className="proof-num">3 domaines</div>
                <div className="proof-label">Sport, nutrition, mental — une plateforme unique pour la santé globale.</div>
              </div>
            </div>
          </div>

          <div className="quote">
            <div className="quote-mark">"</div>
            <div>
              <div className="quote-text">
                Nous cherchions une solution simple à déployer, conforme RGPD, et qui couvre vraiment les trois piliers de la santé au travail. Goupyl Sport a coché toutes les cases en moins de deux semaines.
              </div>
              <div className="quote-author">
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontFamily: 'Archivo, sans-serif' }}>CL</div>
                <div>
                  <div className="quote-author-name">Camille Laurent</div>
                  <div className="quote-author-role">DRH · Groupe industriel · 320 collaborateurs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO / CONTACT ──────────────────────────────────────── */}
      <section className="l-section" id="demo">
        <div className="container">
          <div className="demo-grid">
            <div className="demo-info">
              <div className="eyebrow" style={{ marginBottom: 18 }}>Démo</div>
              <h2 className="display">Parlons<br />de vos équipes.</h2>
              <p>30 minutes pour comprendre vos enjeux, vous présenter la plateforme et co-construire un plan de déploiement adapté.</p>
              <div className="demo-bullet"><IcCheck size={16} stroke={2.4} /> Diagnostic personnalisé en 30 minutes</div>
              <div className="demo-bullet"><IcCheck size={16} stroke={2.4} /> Démonstration plateforme & reporting RH</div>
              <div className="demo-bullet"><IcCheck size={16} stroke={2.4} /> Devis adapté à votre périmètre</div>
              <div className="demo-bullet"><IcCheck size={16} stroke={2.4} /> Sans engagement, sans pression</div>
            </div>

            {demoSent ? (
              <div className="demo-success">
                <div className="demo-success-icon"><IcCheck size={28} stroke={3} /></div>
                <h3 className="display" style={{ fontSize: 32, margin: '0 0 14px' }}>Merci !</h3>
                <p style={{ color: 'var(--ink-3)', fontSize: 14.5, maxWidth: 360, margin: '0 auto' }}>
                  Votre demande est bien reçue. Un expert Goupyl Sport vous recontacte sous 24 h ouvrées pour caler un créneau.
                </p>
              </div>
            ) : (
              <form className="demo-form" onSubmit={handleDemoSubmit}>
                <div className="demo-form-row">
                  <div className="demo-field">
                    <label>Entreprise</label>
                    <input type="text" required value={demoForm.company} onChange={handleDemoChange('company')} placeholder="Nom de l'entreprise" />
                  </div>
                  <div className="demo-field">
                    <label>Effectif</label>
                    <select required value={demoForm.size} onChange={handleDemoChange('size')}>
                      <option value="">Sélectionner</option>
                      <option>10–50</option>
                      <option>50–200</option>
                      <option>200–500</option>
                      <option>500–1000</option>
                      <option>1000+</option>
                    </select>
                  </div>
                </div>
                <div className="demo-form-row">
                  <div className="demo-field">
                    <label>Nom & prénom</label>
                    <input type="text" required value={demoForm.name} onChange={handleDemoChange('name')} placeholder="Votre nom" />
                  </div>
                  <div className="demo-field">
                    <label>Téléphone</label>
                    <input type="tel" value={demoForm.phone} onChange={handleDemoChange('phone')} placeholder="06 12 34 56 78" />
                  </div>
                </div>
                <div className="demo-field">
                  <label>Email professionnel</label>
                  <input type="email" required value={demoForm.email} onChange={handleDemoChange('email')} placeholder="vous@entreprise.fr" />
                </div>
                <div className="demo-field">
                  <label>Votre projet</label>
                  <textarea value={demoForm.message} onChange={handleDemoChange('message')} placeholder="Quelques mots sur votre contexte, vos enjeux..." />
                </div>
                <button type="submit" className="btn btn-primary btn-lg btn-block">Demander une démo gratuite <IcArrow size={16} /></button>
                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)', fontFamily: '"JetBrains Mono", monospace', textAlign: 'center' }}>
                  Vos données sont traitées conformément au RGPD.
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── PROS ────────────────────────────────────────────────── */}
      <section className="l-section">
        <div className="container">
          <div className="dark-card">
            <div className="eyebrow" style={{ marginBottom: 18, color: '#999' }}>Réseau de pros</div>
            <h2 className="display">Rejoindre Goupyl<br />en tant que pro.</h2>
            <p>Coachs sportifs, diététiciens, préparateurs mentaux : intégrez notre réseau dédié aux entreprises et accompagnez des collaborateurs engagés dans des programmes structurés.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
              {[IcRun, IcLeaf, IcBrain].map((I, i) => (
                <span key={i} style={{ width: 48, height: 48, border: '1px solid rgba(255,255,255,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <I size={20} stroke={1.5} />
                </span>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <Link to="/register?role=INTERVENANT" className="btn btn-on-dark btn-lg">Devenir intervenant <IcArrow size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="l-section">
        <div className="container" style={{ maxWidth: 880 }}>
          <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 14 }}>FAQ</div>
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
                La plateforme B2B de sport-santé en entreprise. Sport, nutrition, mental — par des professionnels certifiés.
              </p>
            </div>
            <div className="foot-col">
              <h4>Plateforme</h4>
              <a href="#parcours">Deux parcours</a>
              <a href="#comment-ca-marche">Comment ça marche</a>
              <a href="#pour-qui">Pour qui</a>
              <a href="#preuves">Preuves</a>
            </div>
            <div className="foot-col">
              <h4>Offres</h4>
              <a href="#offres">Essentiel</a>
              <a href="#offres">Boost</a>
              <a href="#offres">Ultra</a>
              <a href="#demo">Demander une démo</a>
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