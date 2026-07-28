import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { appointmentApi } from '../../services/appointment.api';
import { userApi } from '../../services/user.api';
import { coachServiceApi } from '../../services/coachService.api';
import Spinner from '../../components/ui/Spinner';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import {
  Calendar, Clock, Users, Activity, Wallet, ArrowRight,
  Package, Check, X as XIcon, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ID_CSS = `
  .id-hero{background:#191917;border-radius:20px;padding:26px 28px;display:flex;align-items:center;gap:22px;color:#fff;flex-wrap:wrap}
  .id-hero-icon{width:56px;height:56px;border-radius:16px;background:rgba(244,83,15,.18);border:1px solid rgba(244,83,15,.35);display:flex;align-items:center;justify-content:center;color:#FF9C6B;flex-shrink:0}
  .id-hero-body{flex:1;min-width:220px}
  .id-hero-eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#FF9C6B}
  .id-hero-title{font-size:24px;font-weight:700;letter-spacing:-.02em;margin-top:6px;line-height:1.15}
  .id-hero-sub{font-size:13.5px;color:rgba(255,255,255,.75);margin-top:6px}
  .id-hero-cta{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 20px;border-radius:999px;background:#F4530F;color:#fff;font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap;transition:transform .15s ease}
  .id-hero-cta:hover{transform:translateY(-1px)}

  .id-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:900px){.id-stats{grid-template-columns:1fr}}
  .id-stat{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:#fff}
  .id-stat-head{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
  .id-stat-value{font-size:38px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin-top:12px;line-height:1;display:flex;align-items:baseline;gap:6px}
  .id-stat-unit{font-size:16px;font-weight:500;color:var(--ink-3)}
  .id-stat-delta{font-size:12.5px;font-weight:600;color:#2F7A47;display:inline-flex;align-items:center;gap:3px;margin-left:auto}

  .id-rdv-card{border:1px solid var(--line);border-radius:20px;padding:24px;background:#fff}
  .id-rdv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap}
  .id-rdv-head h2{font-size:17px;font-weight:700;letter-spacing:-.01em;margin:0}
  .id-rdv-list{display:flex;flex-direction:column;gap:10px}
  .id-rdv{border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .id-rdv-icon{width:42px;height:42px;border-radius:50%;background:#FBF0DF;color:#A87616;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .id-rdv-info{flex:1;min-width:200px}
  .id-rdv-name{font-size:14.5px;font-weight:600;color:var(--ink)}
  .id-rdv-sub{font-size:12.5px;color:var(--ink-3);margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .id-rdv-note{font-size:12.5px;color:var(--ink-3);font-style:italic;margin-top:6px}
  .id-rdv-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}

  .id-links{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:700px){.id-links{grid-template-columns:1fr}}
  .id-link{border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;background:#fff;transition:border-color .2s,transform .15s ease,box-shadow .2s}
  .id-link:hover{border-color:#c9c7c1;transform:translateY(-2px);box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .id-link-icon{width:46px;height:46px;border-radius:14px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .id-link-title{font-size:14.5px;font-weight:600;color:var(--ink)}
  .id-link-sub{font-size:12.5px;color:var(--ink-3);margin-top:2px}
  .id-link svg.id-link-arrow{margin-left:auto;color:var(--ink-3);flex-shrink:0}
`;

const apptPrice = (a) => Number(a.coachService?.price ?? a.service?.price ?? 0);
const sameMonth = (d, ref) => d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();

const dayDiffLabel = (date) => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startTarget - startToday) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  return `dans ${days} jours`;
};

export default function IntervenantDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [hasServices, setHasServices] = useState(false);

  const fetchData = () => {
    Promise.all([
      appointmentApi.getMyAppointments({ page: 1, limit: 100 }),
      userApi.getMe(),
      coachServiceApi.getMine(),
    ])
      .then(([{ data: appts }, { data: me }, { data: services }]) => {
        setAppointments(appts.appointments || []);
        setProfile(me);
        setHasServices(Array.isArray(services) ? services.filter(s => s.active).length > 0 : false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleConfirm = async (id) => {
    try {
      await appointmentApi.updateStatus(id, 'CONFIRMED');
      toast.success('Séance confirmée');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleRefuse = async (id) => {
    try {
      await appointmentApi.updateStatus(id, 'CANCELLED');
      toast.success('Séance refusée');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleComplete = async (id) => {
    try {
      await appointmentApi.updateStatus(id, 'DONE');
      toast.success('RDV marque comme termine');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <Spinner />;

  const now = new Date();
  const active = appointments.filter((a) => a.status !== 'CANCELLED');
  const pending = appointments
    .filter((a) => a.status === 'PENDING')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const nextConfirmed = active
    .filter((a) => a.status === 'CONFIRMED' && new Date(a.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;

  // Stats du mois
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthCount = active.filter((a) => sameMonth(new Date(a.scheduledAt), now)).length;
  const lastMonthCount = active.filter((a) => sameMonth(new Date(a.scheduledAt), lastMonth)).length;
  const delta = monthCount - lastMonthCount;
  const clientCount = new Set(active.map((a) => a.client?.id).filter(Boolean)).size;
  // 70 % reviennent au professionnel (30 % de commission plateforme)
  const earnedMonth = active
    .filter((a) => a.status === 'DONE' && (a.paymentStatus === 'paid' || a.coveredByCompany) && sameMonth(new Date(a.scheduledAt), now))
    .reduce((sum, a) => sum + apptPrice(a) * 0.7, 0);

  const onboardingSteps = [
    {
      id: 'profile',
      label: 'Compléter votre profil',
      description: 'Ajoutez votre bio, ville et tarif pour attirer des clients.',
      to: '/dashboard/intervenant/profile',
      done: !!(profile?.profile?.bio && profile?.profile?.city),
    },
    {
      id: 'services',
      label: 'Créer vos services',
      description: 'Définissez vos prestations, durées et prix pour que les clients puissent réserver.',
      to: '/dashboard/intervenant/profile',
      done: hasServices,
    },
    {
      id: 'documents',
      label: 'Envoyer vos documents',
      description: "Diplômes et pièce d'identité requis pour activer votre profil.",
      to: '/dashboard/intervenant/profile',
      done: profile?.verificationStatus === 'VERIFIED',
    },
    {
      id: 'payments',
      label: 'Configurer les paiements',
      description: 'Connectez votre compte bancaire via Stripe pour recevoir vos paiements.',
      to: '/dashboard/intervenant/payments',
      done: profile?.stripeAccountStatus === 'active',
    },
  ];

  return (
    <div className="dsh-page">
      <style>{ID_CSS}</style>

      <OnboardingChecklist
        storageKey={`onboarding-intervenant-${user.id}`}
        title="Bienvenue sur Goupyl Sport !"
        subtitle="Suivez ces étapes pour démarrer et recevoir vos premières réservations."
        steps={onboardingSteps}
      />

      {/* ── Prochaine séance / demandes en attente ── */}
      {pending.length > 0 ? (
        <section className="id-hero">
          <div className="id-hero-icon"><Clock size={24} /></div>
          <div className="id-hero-body">
            <div className="id-hero-eyebrow">À traiter</div>
            <h2 className="id-hero-title">
              {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
            </h2>
            <p className="id-hero-sub">
              Confirmez ou refusez vos nouvelles réservations pour libérer vos créneaux.
            </p>
          </div>
          <Link to="/dashboard/intervenant/agenda" className="id-hero-cta">
            Voir mon agenda <ArrowRight size={15} />
          </Link>
        </section>
      ) : nextConfirmed ? (
        <section className="id-hero">
          <div className="id-hero-icon"><Calendar size={24} /></div>
          <div className="id-hero-body">
            <div className="id-hero-eyebrow">
              Prochaine séance · {dayDiffLabel(new Date(nextConfirmed.scheduledAt))}
            </div>
            <h2 className="id-hero-title">
              {nextConfirmed.coachService?.name || nextConfirmed.service?.name || 'Séance'}
            </h2>
            <p className="id-hero-sub">
              Avec {nextConfirmed.client?.firstName} {nextConfirmed.client?.lastName}
              {' · '}
              {new Date(nextConfirmed.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {new Date(nextConfirmed.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Link to="/dashboard/intervenant/agenda" className="id-hero-cta">
            Voir mon agenda <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        <section className="id-hero">
          <div className="id-hero-icon"><Calendar size={24} /></div>
          <div className="id-hero-body">
            <div className="id-hero-eyebrow">Agenda</div>
            <h2 className="id-hero-title">Aucune séance à venir</h2>
            <p className="id-hero-sub">
              Vérifiez que vos services sont en ligne pour recevoir de nouvelles réservations.
            </p>
          </div>
          <Link to="/dashboard/intervenant/services" className="id-hero-cta">
            Mes services <ArrowRight size={15} />
          </Link>
        </section>
      )}

      {/* ── Stats ── */}
      <section className="id-stats">
        <div className="id-stat">
          <div className="id-stat-head">Séances ce mois <Activity size={16} /></div>
          <div className="id-stat-value">
            {monthCount}
            {delta !== 0 && (
              <span className="id-stat-delta" style={delta < 0 ? { color: '#A87616' } : undefined}>
                <TrendingUp size={13} /> {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
        </div>
        <div className="id-stat">
          <div className="id-stat-head">Clients suivis <Users size={16} /></div>
          <div className="id-stat-value">{clientCount}</div>
        </div>
        <div className="id-stat">
          <div className="id-stat-head">Gains ce mois <Wallet size={16} /></div>
          <div className="id-stat-value" style={{ color: '#F4530F' }}>
            {earnedMonth.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            <span className="id-stat-unit">€</span>
          </div>
        </div>
      </section>

      {/* ── Demandes en attente ── */}
      <section className="id-rdv-card">
        <div className="id-rdv-head">
          <h2>Demandes de réservation</h2>
          {pending.length > 0 && (
            <span className="dsh-badge dsh-badge--wait"><i />{pending.length} en attente</span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#8a8781', fontSize: 13.5, fontWeight: 500 }}>
            Aucune demande en attente
          </div>
        ) : (
          <div className="id-rdv-list">
            {pending.map((rdv) => (
              <div key={rdv.id} className="id-rdv">
                <div className="id-rdv-icon"><Clock size={18} /></div>
                <div className="id-rdv-info">
                  <div className="id-rdv-name">{rdv.coachService?.name || rdv.service?.name}</div>
                  <div className="id-rdv-sub">
                    <span>Client : {rdv.client?.firstName} {rdv.client?.lastName}</span>
                    {rdv.coveredByCompany && (
                      <span className="dsh-badge dsh-badge--orange">
                        {rdv.client?.employerCompany?.companyName || 'Entreprise'}
                      </span>
                    )}
                  </div>
                  <div className="id-rdv-sub">
                    {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  {rdv.notes && <div className="id-rdv-note">"{rdv.notes}"</div>}
                </div>
                <div className="id-rdv-right">
                  <button type="button" className="dsh-btn dsh-btn--orange dsh-btn--sm" onClick={() => handleConfirm(rdv.id)}>
                    <Check size={14} /> Accepter
                  </button>
                  <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={() => handleRefuse(rdv.id)}>
                    <XIcon size={14} /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Séances confirmées à clôturer ── */}
      {active.filter((a) => a.status === 'CONFIRMED' && new Date(a.scheduledAt) <= now).length > 0 && (
        <section className="id-rdv-card">
          <div className="id-rdv-head">
            <h2>Séances à clôturer</h2>
          </div>
          <div className="id-rdv-list">
            {active
              .filter((a) => a.status === 'CONFIRMED' && new Date(a.scheduledAt) <= now)
              .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
              .slice(0, 5)
              .map((rdv) => {
                const blocked = rdv.paymentStatus !== 'paid' && !rdv.coveredByCompany;
                return (
                  <div key={rdv.id} className="id-rdv">
                    <div className="id-rdv-icon" style={{ background: '#EAF3EC', color: '#2F7A47' }}>
                      <Calendar size={18} />
                    </div>
                    <div className="id-rdv-info">
                      <div className="id-rdv-name">{rdv.coachService?.name || rdv.service?.name}</div>
                      <div className="id-rdv-sub">
                        <span>Client : {rdv.client?.firstName} {rdv.client?.lastName}</span>
                        {rdv.coveredByCompany && (
                          <span className="dsh-badge dsh-badge--orange">Paiement via Goupyl Sport</span>
                        )}
                        {blocked && (
                          <span className="dsh-badge dsh-badge--wait"><i />En attente de paiement</span>
                        )}
                      </div>
                      <div className="id-rdv-sub">
                        {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                          weekday: 'long', day: 'numeric', month: 'long',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="id-rdv-right">
                      <button
                        type="button"
                        className="dsh-btn dsh-btn--orange dsh-btn--sm"
                        onClick={() => handleComplete(rdv.id)}
                        disabled={blocked}
                        title={blocked ? 'Le client doit payer avant de clôturer' : ''}
                      >
                        <Check size={14} /> Terminer
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* ── Accès rapides ── */}
      <section className="id-links">
        <Link to="/dashboard/intervenant/agenda" className="id-link">
          <div className="id-link-icon"><Calendar size={20} /></div>
          <div>
            <div className="id-link-title">Mon agenda</div>
            <div className="id-link-sub">Séances, QR et absences</div>
          </div>
          <ArrowRight size={18} className="id-link-arrow" />
        </Link>
        <Link to="/dashboard/intervenant/services" className="id-link">
          <div className="id-link-icon"><Package size={20} /></div>
          <div>
            <div className="id-link-title">Mes services</div>
            <div className="id-link-sub">Prestations, durées et tarifs</div>
          </div>
          <ArrowRight size={18} className="id-link-arrow" />
        </Link>
      </section>
    </div>
  );
}
