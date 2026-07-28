import { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Clock, XCircle } from 'lucide-react';

// CSS partagé du dashboard (layout + sidebar + header) — design system landing
const DBL_CSS = `
  .dbl{--bg:#EBEAE6;--card:#FFFFFF;--ink:#171614;--ink-2:#4c4a46;--ink-3:#8a8781;--line:#E4E2DC;--orange:#F4530F;--orange-soft:#FEF1EA;min-height:100vh;background:var(--bg);padding:16px;display:flex;gap:14px;font-family:"Inter",system-ui,-apple-system,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
  .dbl *{box-sizing:border-box}
  .dbl-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px}
  .dbl-content{background:var(--card);border-radius:20px;padding:28px;flex:1;min-width:0}

  /* ── Sidebar ── */
  .dbl-side{width:252px;flex-shrink:0}
  .dbl-side-card{position:sticky;top:16px;height:calc(100vh - 32px);background:var(--card);border-radius:20px;padding:22px 14px 18px;display:flex;flex-direction:column;overflow-y:auto}
  .dbl-brand{display:flex;align-items:center;gap:10px;padding:0 8px;text-decoration:none;color:inherit}
  .dbl-brand img{width:200px;flex-shrink:0}
  .dbl-brand-name{font-size:15.5px;font-weight:800;letter-spacing:-.02em;color:var(--ink);line-height:1.1}
  .dbl-brand-role{font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin-top:2px}
  .dbl-nav{margin-top:26px;flex:1;display:flex;flex-direction:column;gap:4px}
  .dbl-nav-item{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:12px;font-size:13.5px;font-weight:500;color:var(--ink-2);text-decoration:none;transition:background .15s,color .15s}
  .dbl-nav-item:hover{background:#F5F4F1;color:var(--ink)}
  .dbl-nav-item.is-active{background:var(--orange-soft);color:var(--orange);font-weight:600}
  .dbl-side-user{border-top:1px solid var(--line);padding-top:14px;margin-top:14px;display:flex;gap:10px;align-items:center;padding-left:8px;padding-right:8px}
  .dbl-side-avatar{width:38px;height:38px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
  .dbl-side-user-name{font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dbl-side-user-role{font-size:11px;font-weight:500;color:var(--ink-3);margin-top:1px}

  /* ── Header ── */
  .dbl-head{background:var(--card);border-radius:20px;padding:18px 24px;display:flex;align-items:center;gap:18px}
  .dbl-head-date{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
  .dbl-head-title{font-size:23px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin-top:3px;line-height:1.1}
  .dbl-head-right{margin-left:auto;display:flex;align-items:center;gap:10px}
  .dbl-head-search{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;height:42px;padding:0 8px 0 16px;background:#fff;min-width:240px}
  .dbl-head-search input{border:none;outline:none;background:transparent;font-family:inherit;font-size:13.5px;color:var(--ink);flex:1;min-width:0}
  .dbl-head-search input::placeholder{color:var(--ink-3)}
  .dbl-head-icon{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-2);cursor:pointer;transition:border-color .15s,color .15s}
  .dbl-head-icon:hover{border-color:#c9c7c1;color:var(--ink)}

  /* ── Bannière vérification ── */
  .dbl-banner{border-radius:16px;padding:12px 20px;display:flex;align-items:center;gap:12px;font-size:13px}
  .dbl-banner a{margin-left:auto;flex-shrink:0;font-weight:600;font-size:12.5px;text-decoration:underline;text-underline-offset:2px}

  /* ══ Primitives partagées par les pages du dashboard ══ */
  .dsh-page{display:flex;flex-direction:column;gap:20px}
  .dsh-page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .dsh-h1{font-size:24px;font-weight:700;letter-spacing:-.025em;color:var(--ink);margin:0}
  .dsh-sub{font-size:13.5px;color:var(--ink-3);margin:5px 0 0}
  .dsh-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px}
  .dsh-card-title{font-size:16px;font-weight:700;letter-spacing:-.01em;color:var(--ink);margin:0}
  .dsh-card-sub{font-size:12.5px;color:var(--ink-3);margin:4px 0 0}
  .dsh-sep{height:1px;background:var(--line);border:none;margin:4px 0}

  .dsh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 22px;border-radius:999px;border:1px solid transparent;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap;transition:transform .15s ease,background .2s,border-color .2s,color .2s}
  .dsh-btn:hover{transform:translateY(-1px)}
  .dsh-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .dsh-btn--orange{background:var(--orange);color:#fff}
  .dsh-btn--ghost{background:#fff;color:var(--ink-2);border-color:var(--line);font-weight:500}
  .dsh-btn--ghost:hover{border-color:#c9c7c1;color:var(--ink)}
  .dsh-btn--danger{background:#fff;color:#c0392b;border-color:#EFC7BE;font-weight:600}
  .dsh-btn--danger:hover{background:#FBEAE7}
  .dsh-btn--danger-solid{background:#c0392b;color:#fff}
  .dsh-btn--sm{height:36px;padding:0 16px;font-size:12.5px;gap:6px}

  .dsh-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:999px;white-space:nowrap}
  .dsh-badge i{width:5px;height:5px;border-radius:50%;background:currentColor;font-style:normal}
  .dsh-badge--ok{background:#EAF3EC;color:#2F7A47}
  .dsh-badge--wait{background:#FBF0DF;color:#A87616}
  .dsh-badge--err{background:#FBEAE7;color:#C0392B}
  .dsh-badge--neutral{background:#F2F1ED;color:var(--ink-2)}
  .dsh-badge--orange{background:var(--orange-soft);color:var(--orange)}

  .dsh-label{display:block;font-size:12.5px;font-weight:500;color:var(--ink-2);margin-bottom:7px}
  .dsh-input,.dsh-select,.dsh-textarea{width:100%;background:#fff;border:1px solid var(--line);border-radius:12px;padding:0 16px;font-family:inherit;font-size:14px;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}
  .dsh-input,.dsh-select{height:46px}
  .dsh-textarea{padding:13px 16px;line-height:1.55;resize:vertical}
  .dsh-input::placeholder,.dsh-textarea::placeholder{color:var(--ink-3)}
  .dsh-input:focus,.dsh-select:focus,.dsh-textarea:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(244,83,15,.12)}
  .dsh-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a8781' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:40px}
  .dsh-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:560px){.dsh-row{grid-template-columns:1fr}}

  .dsh-chip{padding:8px 16px;border-radius:999px;border:1px solid var(--line);background:#fff;font-family:inherit;font-size:13px;font-weight:500;color:var(--ink-2);cursor:pointer;transition:border-color .15s,background .15s,color .15s}
  .dsh-chip:hover{border-color:#c9c7c1;color:var(--ink)}
  .dsh-chip.is-active{background:var(--orange);border-color:var(--orange);color:#fff;font-weight:600}
  .dsh-chips{display:flex;flex-wrap:wrap;gap:8px}

  .dsh-tabs{display:inline-flex;gap:4px;padding:4px;border-radius:999px;border:1px solid var(--line);background:#fff}
  .dsh-tab{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;border:none;background:transparent;font-family:inherit;font-size:13px;font-weight:500;color:var(--ink-2);cursor:pointer;transition:background .15s,color .15s}
  .dsh-tab:hover{color:var(--ink)}
  .dsh-tab.is-active{background:var(--orange);color:#fff;font-weight:600}

  .dsh-empty{border:1px dashed var(--line);border-radius:16px;padding:56px 28px;text-align:center;color:var(--ink-3);font-size:13.5px;font-weight:500;display:flex;flex-direction:column;align-items:center;gap:12px}

  /* Tableaux de données (admin / entreprise) */
  .dsh-table-wrap{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}
  .dsh-table-scroll{overflow-x:auto}
  .dsh-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:620px}
  .dsh-table th{text-align:left;padding:13px 18px;font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);background:#FAF9F7;border-bottom:1px solid var(--line);white-space:nowrap}
  .dsh-table th.num,.dsh-table td.num{text-align:right}
  .dsh-table td{padding:14px 18px;color:var(--ink-2);border-bottom:1px solid #F0EFEB;vertical-align:middle}
  .dsh-table tr:last-child td{border-bottom:none}
  .dsh-table tbody tr:hover{background:#FAF9F7}
  .dsh-table-strong{font-weight:600;color:var(--ink)}
  .dsh-table-muted{color:var(--ink-3);white-space:nowrap}

  /* Barre de recherche de page */
  .dsh-search{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:999px;height:44px;padding:0 18px;background:#fff;flex:1;min-width:220px;transition:border-color .15s,box-shadow .15s}
  .dsh-search:focus-within{border-color:var(--orange);box-shadow:0 0 0 3px rgba(244,83,15,.12)}
  .dsh-search input{border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;color:var(--ink);flex:1;min-width:0}
  .dsh-search input::placeholder{color:var(--ink-3)}
  .dsh-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}

  /* Avatar initiales (listes) */
  .dsh-ini{width:38px;height:38px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;text-transform:uppercase}

  /* ── Nav mobile ── */
  .dbl-mobile-nav{display:none}
  @media(max-width:1023px){
    .dbl{padding:10px;padding-bottom:76px}
    .dbl-side{display:none}
    .dbl-content{padding:20px;border-radius:16px}
    .dbl-head{padding:14px 18px;border-radius:16px;flex-wrap:wrap}
    .dbl-head-search{min-width:0;flex:1}
    .dbl-mobile-nav{display:flex;position:fixed;bottom:10px;left:10px;right:10px;z-index:50;background:var(--card);border:1px solid var(--line);border-radius:18px;height:62px;align-items:stretch;box-shadow:0 8px 24px rgba(23,22,20,.10)}
    .dbl-mobile-item{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;font-weight:500;color:var(--ink-3);transition:color .15s}
    .dbl-mobile-item.is-active{color:var(--orange)}
    .dbl-mobile-item span{font-size:10px;letter-spacing:.02em}
  }
`;

function VerificationBanner() {
  const { user } = useAuth();
  if (user?.role !== 'INTERVENANT') return null;

  const docPath = '/dashboard/intervenant/profile#documents';

  if (user?.verificationStatus === 'PENDING') {
    return (
      <div className="dbl-banner" style={{ background: '#FBF3E2', border: '1px solid #EBD9B4' }}>
        <Clock style={{ width: 15, height: 15, color: '#b45309', flexShrink: 0 }} />
        <span style={{ color: '#92400e' }}>
          <strong>Compte en cours de vérification.</strong>{' '}
          Votre profil sera visible des clients une fois validé.
        </span>
        <Link to={docPath} style={{ color: '#92400e' }}>
          Envoyer mes documents
        </Link>
      </div>
    );
  }

  if (user?.verificationStatus === 'REJECTED') {
    return (
      <div className="dbl-banner" style={{ background: '#FBEAE7', border: '1px solid #EFC7BE' }}>
        <XCircle style={{ width: 15, height: 15, color: '#dc2626', flexShrink: 0 }} />
        <span style={{ color: '#991b1b' }}>
          <strong>Vérification refusée.</strong>{' '}
          Contactez notre équipe ou soumettez de nouveaux documents.
        </span>
        <Link to={docPath} style={{ color: '#991b1b' }}>
          Renvoyer des documents
        </Link>
      </div>
    );
  }

  return null;
}

export default function DashboardLayout() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  return (
    <div className="dbl">
      <style>{DBL_CSS}</style>
      <Sidebar />
      <div className="dbl-main">
        <Navbar />
        <VerificationBanner />
        <main className="dbl-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
