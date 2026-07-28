import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { appointmentApi } from '../../services/appointment.api';
import Spinner from '../../components/ui/Spinner';
import PaymentModal from '../../components/payment/PaymentModal';
import QrCodeModal from '../../components/appointment/QrCodeModal';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import { userApi } from '../../services/user.api';
import {
  Calendar, Search, Clock, ArrowRight, CreditCard,
  Activity, Users, Wallet, QrCode, TrendingUp,
} from 'lucide-react';

const CD_CSS = `
  .cd{display:flex;flex-direction:column;gap:20px;--ink:#171614;--ink-2:#4c4a46;--ink-3:#8a8781;--line:#E4E2DC;--orange:#F4530F;--orange-soft:#FEF1EA}
  .cd *{box-sizing:border-box}

  /* ── Prochaine séance ── */
  .cd-hero{background:#0a0e26;border-radius:20px;padding:26px 28px;display:flex;align-items:center;gap:22px;color:#fff;flex-wrap:wrap}
  .cd-hero-icon{width:56px;height:56px;border-radius:16px;background:rgba(244,83,15,.18);border:1px solid rgba(244,83,15,.35);display:flex;align-items:center;justify-content:center;color:#FF9C6B;flex-shrink:0}
  .cd-hero-body{flex:1;min-width:220px}
  .cd-hero-eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#FF9C6B}
  .cd-hero-title{font-size:24px;font-weight:700;letter-spacing:-.02em;margin-top:6px;line-height:1.15}
  .cd-hero-sub{font-size:13.5px;color:rgba(255,255,255,.75);margin-top:6px}
  .cd-hero-actions{display:flex;flex-direction:column;gap:10px;align-items:stretch}
  .cd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 20px;border-radius:999px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;border:none;transition:transform .15s ease;white-space:nowrap}
  .cd-btn:hover{transform:translateY(-1px)}
  .cd-btn--orange{background:var(--orange);color:#fff}
  .cd-btn--ghost-dark{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)}
  .cd-btn--ghost-dark:hover{border-color:rgba(255,255,255,.6)}
  .cd-hero-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff}

  /* ── Stats ── */
  .cd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:900px){.cd-stats{grid-template-columns:1fr}}
  .cd-stat{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:#fff}
  .cd-stat-head{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
  .cd-stat-head svg{color:var(--ink-3)}
  .cd-stat-value{font-size:38px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin-top:12px;line-height:1;display:flex;align-items:baseline;gap:6px}
  .cd-stat-unit{font-size:16px;font-weight:500;color:var(--ink-3)}
  .cd-stat-delta{font-size:12.5px;font-weight:600;color:#2F7A47;display:inline-flex;align-items:center;gap:3px;margin-left:auto}

  /* ── Rendez-vous ── */
  .cd-rdv-card{border:1px solid var(--line);border-radius:20px;padding:24px;background:#fff}
  .cd-rdv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap}
  .cd-rdv-head h2{font-size:17px;font-weight:700;letter-spacing:-.01em;margin:0}
  .cd-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:6px 13px;border-radius:999px;border:1px solid var(--orange);color:var(--orange);text-decoration:none}
  .cd-rdv-list{display:flex;flex-direction:column;gap:10px}
  .cd-rdv{border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .cd-rdv-icon{width:42px;height:42px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .cd-rdv-info{flex:1;min-width:180px}
  .cd-rdv-name{font-size:14.5px;font-weight:600;color:var(--ink)}
  .cd-rdv-sub{font-size:12.5px;color:var(--ink-3);margin-top:2px}
  .cd-rdv-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .cd-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:999px}
  .cd-badge i{width:5px;height:5px;border-radius:50%;background:currentColor;font-style:normal}
  .cd-badge--ok{background:#EAF3EC;color:#2F7A47}
  .cd-badge--wait{background:#FBF0DF;color:#A87616}
  .cd-badge--covered{background:var(--orange-soft);color:var(--orange)}
  .cd-btn--sm{height:36px;padding:0 16px;font-size:12.5px}
  .cd-empty{text-align:center;padding:36px 20px;color:var(--ink-3);font-size:13.5px;font-weight:500}

  /* ── Accès rapides ── */
  .cd-links{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:700px){.cd-links{grid-template-columns:1fr}}
  .cd-link{border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;background:#fff;transition:border-color .2s,transform .15s ease,box-shadow .2s}
  .cd-link:hover{border-color:#c9c7c1;transform:translateY(-2px);box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .cd-link-icon{width:46px;height:46px;border-radius:14px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .cd-link-title{font-size:14.5px;font-weight:600;color:var(--ink)}
  .cd-link-sub{font-size:12.5px;color:var(--ink-3);margin-top:2px}
  .cd-link svg.cd-link-arrow{margin-left:auto;color:var(--ink-3);flex-shrink:0}
`;

const dayDiffLabel = (date) => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startTarget - startToday) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  return `dans ${days} jours`;
};

const apptPrice = (a) => Number(a.coachService?.price ?? a.service?.price ?? 0);
const sameMonth = (d, ref) => d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();

export default function ClientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingRdv, setPayingRdv] = useState(null);
  const [qrRdv, setQrRdv] = useState(null);
  const [freshProfile, setFreshProfile] = useState(null);

  const fetchData = () => {
    Promise.all([
      appointmentApi.getMyAppointments({ page: 1, limit: 100 }),
      userApi.getMe(),
    ])
      .then(([{ data: appts }, { data: me }]) => {
        setAppointments(appts.appointments || []);
        setFreshProfile(me);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Spinner />;

  const now = new Date();
  const active = appointments.filter((a) => a.status !== 'CANCELLED');
  const upcoming = active
    .filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status) && new Date(a.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const next = upcoming.find((a) => a.status === 'CONFIRMED') || upcoming[0] || null;

  // Stats du mois
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthCount = active.filter((a) => sameMonth(new Date(a.scheduledAt), now)).length;
  const lastMonthCount = active.filter((a) => sameMonth(new Date(a.scheduledAt), lastMonth)).length;
  const delta = monthCount - lastMonthCount;
  const coachCount = new Set(active.map((a) => a.intervenant?.id).filter(Boolean)).size;
  const spentMonth = active
    .filter((a) => a.paymentStatus === 'paid' && sameMonth(new Date(a.scheduledAt), now))
    .reduce((sum, a) => sum + apptPrice(a), 0);

  const canPay = (a) => a.status === 'CONFIRMED' && a.paymentStatus !== 'paid' && !a.coveredByCompany;

  const isSalarie = !!user.employerCompanyId;
  const hasPhone = !!(freshProfile?.phone);
  const hasEverBooked = appointments.length > 0;

  const onboardingSteps = isSalarie ? [
    {
      id: 'profile',
      label: 'Compléter votre profil',
      description: 'Ajoutez votre prénom, nom et téléphone.',
      to: '/dashboard/client/profile',
      done: hasPhone,
    },
    {
      id: 'plan',
      label: 'Consulter votre forfait entreprise',
      description: 'Découvrez votre quota mensuel de séances prises en charge.',
      to: '/dashboard/client/employer-plan',
      done: false,
    },
    {
      id: 'search',
      label: 'Trouver un professionnel',
      description: 'Explorez nos coachs sportifs, nutritionnistes et praticiens bien-être.',
      to: '/dashboard/client/search',
      done: hasEverBooked,
    },
  ] : [
    {
      id: 'profile',
      label: 'Compléter votre profil',
      description: 'Ajoutez votre prénom, nom et téléphone.',
      to: '/dashboard/client/profile',
      done: hasPhone,
    },
    {
      id: 'search',
      label: 'Trouver un professionnel',
      description: 'Parcourez nos coachs et choisissez celui qui vous correspond.',
      to: '/dashboard/client/search',
      done: hasEverBooked,
    },
    {
      id: 'book',
      label: 'Réserver votre première séance',
      description: 'Choisissez un service, une date et payez en ligne.',
      to: '/dashboard/client/search',
      done: hasEverBooked,
    },
  ];

  const rdvBadge = (a) => {
    if (a.status === 'PENDING') return <span className="cd-badge cd-badge--wait"><i />En attente</span>;
    return <span className="cd-badge cd-badge--ok"><i />Confirmé</span>;
  };

  const rdvPayment = (a) => {
    if (a.paymentStatus === 'paid') {
      return <span className="cd-badge cd-badge--ok"><CreditCard size={12} /> Payé</span>;
    }
    if (a.coveredByCompany) {
      return <span className="cd-badge cd-badge--covered"><CreditCard size={12} /> Couvert</span>;
    }
    if (canPay(a)) {
      return (
        <button type="button" className="cd-btn cd-btn--orange cd-btn--sm" onClick={() => setPayingRdv(a)}>
          <CreditCard size={13} /> Payer
        </button>
      );
    }
    return null;
  };

  return (
    <div className="cd">
      <style>{CD_CSS}</style>

      <OnboardingChecklist
        storageKey={`onboarding-client-${user.id}`}
        title="Bienvenue sur Goupyl Sport !"
        subtitle="Suivez ces étapes pour réserver votre première séance."
        steps={onboardingSteps}
      />

      {/* ── Prochaine séance ── */}
      {next ? (
        <section className="cd-hero">
          <div className="cd-hero-icon"><Clock size={24} /></div>
          <div className="cd-hero-body">
            <div className="cd-hero-eyebrow">
              Prochaine séance · {dayDiffLabel(new Date(next.scheduledAt))}
            </div>
            <h2 className="cd-hero-title">{next.coachService?.name || next.service?.name || 'Séance'}</h2>
            <p className="cd-hero-sub">
              Avec {next.intervenant?.firstName} {next.intervenant?.lastName}
              {' · '}
              {new Date(next.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {new Date(next.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {apptPrice(next) > 0 && ` · ${apptPrice(next).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`}
            </p>
          </div>
          <div className="cd-hero-actions">
            {canPay(next) && (
              <button type="button" className="cd-btn cd-btn--orange" onClick={() => setPayingRdv(next)}>
                <CreditCard size={15} /> Payer la séance
              </button>
            )}
            {next.paymentStatus === 'paid' && (
              <span className="cd-hero-badge"><CreditCard size={13} /> Payé</span>
            )}
            {next.coveredByCompany && (
              <span className="cd-hero-badge"><CreditCard size={13} /> Couvert par votre entreprise</span>
            )}
            {next.qrToken && next.status === 'CONFIRMED' && (
              <button type="button" className="cd-btn cd-btn--ghost-dark" onClick={() => setQrRdv(next)}>
                <QrCode size={15} /> QR séance
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="cd-hero">
          <div className="cd-hero-icon"><Calendar size={24} /></div>
          <div className="cd-hero-body">
            <div className="cd-hero-eyebrow">Prochaine séance</div>
            <h2 className="cd-hero-title">Aucune séance à venir</h2>
            <p className="cd-hero-sub">Trouvez un coach et réservez votre prochaine séance en quelques clics.</p>
          </div>
          <div className="cd-hero-actions">
            <Link to="/dashboard/client/search" className="cd-btn cd-btn--orange">
              <Search size={15} /> Trouver un coach
            </Link>
          </div>
        </section>
      )}

      {/* ── Stats ── */}
      <section className="cd-stats">
        <div className="cd-stat">
          <div className="cd-stat-head">Séances ce mois <Activity size={16} /></div>
          <div className="cd-stat-value">
            {monthCount}
            {delta !== 0 && (
              <span className="cd-stat-delta" style={delta < 0 ? { color: '#A87616' } : undefined}>
                <TrendingUp size={13} /> {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
        </div>
        <div className="cd-stat">
          <div className="cd-stat-head">Coachs suivis <Users size={16} /></div>
          <div className="cd-stat-value">{coachCount}</div>
        </div>
        <div className="cd-stat">
          <div className="cd-stat-head">Dépensé ce mois <Wallet size={16} /></div>
          <div className="cd-stat-value" style={{ color: '#F4530F' }}>
            {spentMonth.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            <span className="cd-stat-unit">€</span>
          </div>
        </div>
      </section>

      {/* ── Prochains rendez-vous ── */}
      <section className="cd-rdv-card">
        <div className="cd-rdv-head">
          <h2>Prochains rendez-vous</h2>
          <Link to="/dashboard/client/appointments" className="cd-pill">
            {upcoming.length} à venir
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="cd-empty">
            Aucun rendez-vous à venir.{' '}
            <Link to="/dashboard/client/search" style={{ color: '#F4530F', fontWeight: 600 }}>
              Réserver une séance
            </Link>
          </div>
        ) : (
          <div className="cd-rdv-list">
            {upcoming.slice(0, 3).map((rdv) => (
              <div key={rdv.id} className="cd-rdv">
                <div className="cd-rdv-icon"><Clock size={18} /></div>
                <div className="cd-rdv-info">
                  <div className="cd-rdv-name">{rdv.coachService?.name || rdv.service?.name}</div>
                  <div className="cd-rdv-sub">
                    Avec {rdv.intervenant?.firstName} {rdv.intervenant?.lastName}
                    {' · '}
                    {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}
                    {new Date(rdv.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="cd-rdv-right">
                  {rdvBadge(rdv)}
                  {rdvPayment(rdv)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Accès rapides ── */}
      <section className="cd-links">
        <Link to="/dashboard/client/search" className="cd-link">
          <div className="cd-link-icon"><Search size={20} /></div>
          <div>
            <div className="cd-link-title">Trouver un professionnel</div>
            <div className="cd-link-sub">Sport, nutrition, mental, bien-être</div>
          </div>
          <ArrowRight size={18} className="cd-link-arrow" />
        </Link>
        <Link to="/dashboard/client/appointments" className="cd-link">
          <div className="cd-link-icon"><Calendar size={20} /></div>
          <div>
            <div className="cd-link-title">Mes rendez-vous</div>
            <div className="cd-link-sub">Historique et à venir</div>
          </div>
          <ArrowRight size={18} className="cd-link-arrow" />
        </Link>
      </section>

      {payingRdv && (
        <PaymentModal
          appointment={payingRdv}
          onClose={() => setPayingRdv(null)}
          onSuccess={() => { setPayingRdv(null); fetchData(); }}
        />
      )}
      {qrRdv && (
        <QrCodeModal appointment={qrRdv} onClose={() => setQrRdv(null)} />
      )}
    </div>
  );
}
