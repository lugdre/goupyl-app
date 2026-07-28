import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscriptionApi } from '../../services/subscription.api';
import { companyApi } from '../../services/company.api';
import { paymentApi } from '../../services/payment.api';
import Spinner from '../../components/ui/Spinner';
import { MODAL_CSS } from '../../components/ui/modalStyles';
import { CreditCard, Users, Activity, CheckCircle, TrendingUp, AlertTriangle, X } from 'lucide-react';
import { PLAN_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const ENTERPRISE_PLANS = [
  {
    value: 'ESSENTIEL_ENTREPRISE',
    priceMonthly: 54,
    priceYearly: 43,
    features: ["Jusqu'à 10 collaborateurs", 'Programme de remise en activité', 'Contenus santé & bien-être', "Suivi d'engagement de base"],
  },
  {
    value: 'BOOST_ENTREPRISE',
    priceMonthly: 122,
    priceYearly: 98,
    popular: true,
    features: ["Jusqu'à 50 collaborateurs", 'Coaching sportif structuré', "Plans d'entraînement personnalisés", 'Suivi nutritionnel & indicateurs de progression', 'Accompagnement mental allégé'],
  },
  {
    value: 'ULTRA_ENTREPRISE',
    quote: true,
    features: ["Jusqu'à 200 collaborateurs", 'Suivi nutritionnel individualisé', 'Accompagnement mental (prépa, stress, performance)', "Biomarqueurs sanguins & tests à l'effort", 'Programme de progression avec objectifs & jalons'],
  },
];

const ES_CSS = `
  .es-current-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .es-current-left{display:flex;align-items:flex-start;gap:14px}
  .es-current-icon{width:46px;height:46px;border-radius:14px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .es-current-name{font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ink);margin:0}
  .es-current-sub{font-size:13px;color:var(--ink-3);margin:4px 0 0}
  .es-current-right{display:flex;align-items:center;gap:10px;flex-shrink:0}

  .es-usage{border-top:1px solid var(--line);padding-top:18px;margin-top:18px;display:flex;flex-direction:column;gap:16px}
  .es-usage-title{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--ink);margin:0}
  .es-usage-title svg{color:var(--orange)}
  .es-bar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:7px}
  .es-bar-label{display:inline-flex;align-items:center;gap:7px;font-weight:500;color:var(--ink-2)}
  .es-bar-label svg{color:var(--orange)}
  .es-bar-count{font-weight:700;color:var(--ink)}
  .es-bar-count.is-danger{color:#C0392B}
  .es-bar-track{height:8px;background:#F2F1ED;border-radius:999px;overflow:hidden}
  .es-bar-fill{height:100%;background:var(--orange);border-radius:999px;transition:width .4s ease}
  .es-bar-fill.is-danger{background:#C0392B}
  .es-usage-hint{font-size:12px;color:var(--ink-3);margin:0}

  .es-picker-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .es-cycle{display:flex;align-items:center;gap:10px}
  .es-cycle-label{font-size:13.5px;font-weight:600;color:var(--ink-3);transition:color .15s}
  .es-cycle-label.is-active{color:var(--ink)}
  .es-toggle{position:relative;width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;background:#DCDAD4;transition:background .2s;flex-shrink:0;padding:0}
  .es-toggle.is-on{background:var(--orange)}
  .es-toggle span{position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 3px rgba(23,22,20,.2)}
  .es-toggle.is-on span{transform:translateX(20px)}

  .es-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:900px){.es-plans{grid-template-columns:1fr}}
  .es-plan{position:relative;border:1px solid var(--line);border-radius:18px;padding:22px;background:#fff;display:flex;flex-direction:column;transition:border-color .2s}
  .es-plan.is-popular{border-color:#F7D3C0}
  .es-plan.is-active{border-color:var(--orange);box-shadow:0 0 0 1px var(--orange)}
  .es-plan-pop{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--orange);color:#fff;font-size:11.5px;font-weight:600;padding:5px 14px;border-radius:999px;white-space:nowrap}
  .es-plan-name{font-size:15.5px;font-weight:700;letter-spacing:-.01em;color:var(--ink);margin:6px 0 0}
  .es-plan-price{margin:10px 0 16px}
  .es-plan-amount{font-size:28px;font-weight:700;letter-spacing:-.02em;color:var(--orange)}
  .es-plan-per{font-size:12.5px;color:var(--ink-3);margin-left:4px}
  .es-plan-note{font-size:11.5px;color:var(--ink-3);margin:4px 0 0}
  .es-plan-feats{list-style:none;margin:0 0 18px;padding:0;display:flex;flex-direction:column;gap:8px;flex:1}
  .es-plan-feats li{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ink-2);line-height:1.45}
  .es-plan-feats svg{color:#2F7A47;flex-shrink:0;margin-top:2px}
  .es-secure{font-size:12px;color:var(--ink-3);margin:14px 0 0}

  .es-history{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
  .es-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;font-size:13.5px;flex-wrap:wrap}
  .es-history-row + .es-history-row{border-top:1px solid #F0EFEB}
  .es-history-plan{font-weight:600;color:var(--ink)}
  .es-history-dates{color:var(--ink-3)}
`;

function UsageBar({ label, icon: Icon, used, max }) {
  const unlimited = max === null;
  // max peut valoir 0 (quota total = 8 × 0 collaborateur) : la division
  // donnerait NaN et la barre s'afficherait pleine.
  const pct = unlimited ? 100 : max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const danger = !unlimited && max > 0 && pct >= 90;
  return (
    <div>
      <div className="es-bar-head">
        <span className="es-bar-label"><Icon size={15} />{label}</span>
        <span className={`es-bar-count${danger ? ' is-danger' : ''}`}>
          {unlimited ? `${used} / Illimité` : `${used} / ${max}`}
        </span>
      </div>
      <div className="es-bar-track">
        <div
          className={`es-bar-fill${danger ? ' is-danger' : ''}`}
          style={{ width: `${pct}%`, opacity: unlimited ? 0.3 : 1 }}
        />
      </div>
    </div>
  );
}

export default function EntrepriseSubscription() {
  const [sub, setSub] = useState({ active: null, history: [] });
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [checkingOut, setCheckingOut] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchAll = () => {
    Promise.all([
      subscriptionApi.getMine().then(({ data }) => setSub(data)),
      companyApi.getUsageStats().then(({ data }) => setUsage(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    if (payment === 'success' && sessionId) {
      setSearchParams({});
      paymentApi.verifySession(sessionId)
        .then(() => { toast.success('Paiement confirmé ! Abonnement actif.'); fetchAll(); })
        .catch(() => { toast.error('Paiement reçu mais activation échouée.'); fetchAll(); });
      return;
    } else if (payment === 'cancelled') {
      toast('Paiement annulé.');
      setSearchParams({});
    }
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = async (plan) => {
    setCheckingOut(plan);
    try {
      const res = await paymentApi.createCheckout(plan, billingCycle);
      const url = res.data?.url;
      if (!url) throw new Error('URL manquante');
      window.location.href = url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur paiement');
      setCheckingOut(null);
    }
  };

  const handleCancel = () => {
    if (!sub.active) return;
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await subscriptionApi.cancel(sub.active.id);
      toast.success('Abonnement résilié');
      setShowCancelModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;

  const isYearly = billingCycle === 'YEARLY';

  return (
    <div className="dsh-page" style={{ maxWidth: 1000 }}>
      <style>{ES_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mon abonnement</h1>
          <p className="dsh-sub">Gérez votre formule et suivez votre consommation</p>
        </div>
      </div>

      {/* Formule actuelle + utilisation */}
      {sub.active ? (
        <div className="dsh-card">
          <div className="es-current-head">
            <div className="es-current-left">
              <div className="es-current-icon"><CreditCard size={20} /></div>
              <div>
                <p className="es-current-name">Formule {PLAN_LABELS[sub.active.plan]}</p>
                <p className="es-current-sub">
                  {sub.active.billingCycle === 'YEARLY' ? 'Facturation annuelle' : 'Facturation mensuelle'} · Renouvellement le{' '}
                  {new Date(sub.active.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="es-current-right">
              {sub.active.status === 'CANCELLED' ? (
                <span className="dsh-badge dsh-badge--wait"><i />Résilié</span>
              ) : (
                <span className="dsh-badge dsh-badge--ok"><i />Actif</span>
              )}
              {sub.active.status === 'ACTIVE' && (
                <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={handleCancel}>
                  Résilier
                </button>
              )}
            </div>
          </div>

          {usage && (
            <div className="es-usage">
              <p className="es-usage-title"><TrendingUp size={15} /> Utilisation ce mois-ci</p>
              <UsageBar
                label="Collaborateurs"
                icon={Users}
                used={usage.employeeCount}
                max={usage.limits.maxEmployees}
              />
              <UsageBar
                label="Séances couvertes"
                icon={Activity}
                used={usage.sessionCount}
                max={usage.limits.totalQuota ?? usage.limits.maxSessions}
              />
              {usage.limits.quotaPerEmployee != null && (
                <p className="es-usage-hint">
                  Quota : {usage.limits.quotaPerEmployee} séances / collaborateur / mois
                  {usage.limits.totalQuota != null && ` (soit ${usage.limits.totalQuota} au total pour ${usage.employeeCount} collaborateur(s))`}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="dsh-empty">
          <CreditCard size={26} />
          Vous n'avez pas d'abonnement actif.
        </div>
      )}

      {/* Choix de formule */}
      <div>
        <div className="es-picker-head" style={{ marginBottom: 20 }}>
          <h2 className="dsh-card-title" style={{ fontSize: 17 }}>
            {sub.active ? 'Changer de formule' : 'Choisir une formule'}
          </h2>
          <div className="es-cycle">
            <span className={`es-cycle-label${!isYearly ? ' is-active' : ''}`}>Mensuel</span>
            <button
              type="button"
              onClick={() => setBillingCycle(isYearly ? 'MONTHLY' : 'YEARLY')}
              className={`es-toggle${isYearly ? ' is-on' : ''}`}
              aria-label="Basculer entre facturation mensuelle et annuelle"
            >
              <span />
            </button>
            <span className={`es-cycle-label${isYearly ? ' is-active' : ''}`}>Annuel</span>
            {isYearly && <span className="dsh-badge dsh-badge--orange">−20 %</span>}
          </div>
        </div>

        <div className="es-plans">
          {ENTERPRISE_PLANS.map((plan) => {
            const isActive = sub.active?.plan === plan.value;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            return (
              <div
                key={plan.value}
                className={`es-plan${plan.popular ? ' is-popular' : ''}${isActive ? ' is-active' : ''}`}
              >
                {plan.popular && <div className="es-plan-pop">Le plus populaire</div>}
                <p className="es-plan-name">{PLAN_LABELS[plan.value]}</p>
                <div className="es-plan-price">
                  {plan.quote ? (
                    <>
                      <span className="es-plan-amount">Sur devis</span>
                      <p className="es-plan-note">Adapté à votre périmètre</p>
                    </>
                  ) : (
                    <>
                      <span className="es-plan-amount">{price} €</span>
                      <span className="es-plan-per">/ collaborateur / mois</span>
                      {isYearly && <p className="es-plan-note">facturé {price * 12} € / collaborateur / an</p>}
                    </>
                  )}
                </div>
                <ul className="es-plan-feats">
                  {plan.features.map((f) => (
                    <li key={f}><CheckCircle size={14} />{f}</li>
                  ))}
                </ul>
                {plan.quote ? (
                  <a href="mailto:entreprises@goupylsport.fr" className="dsh-btn dsh-btn--ghost" style={{ width: '100%' }}>
                    Demander un devis
                  </a>
                ) : (
                  <button
                    type="button"
                    className={`dsh-btn ${isActive ? 'dsh-btn--ghost' : 'dsh-btn--orange'}`}
                    style={{ width: '100%' }}
                    disabled={isActive || checkingOut === plan.value}
                    onClick={() => !isActive && handleCheckout(plan.value)}
                  >
                    {checkingOut === plan.value
                      ? 'Redirection…'
                      : isActive ? 'Formule actuelle' : sub.active ? 'Changer' : "S'abonner"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="es-secure">
          Paiement sécurisé par Stripe{import.meta.env.DEV && ' · Carte de test : 4242 4242 4242 4242 · exp. 12/34 · CVC 123'}
        </p>
      </div>

      {/* Historique */}
      {sub.history?.length > 0 && (
        <div>
          <h2 className="dsh-card-title" style={{ marginBottom: 14 }}>Historique</h2>
          <div className="es-history">
            {sub.history.map((h) => (
              <div key={h.id} className="es-history-row">
                <span className="es-history-plan">{PLAN_LABELS[h.plan]}</span>
                <span className="es-history-dates">
                  {new Date(h.startDate).toLocaleDateString('fr-FR')} → {new Date(h.endDate).toLocaleDateString('fr-FR')}
                </span>
                <span className={`dsh-badge ${h.status === 'ACTIVE' ? 'dsh-badge--ok' : h.status === 'CANCELLED' ? 'dsh-badge--err' : 'dsh-badge--neutral'}`}>
                  <i />{h.status === 'ACTIVE' ? 'Actif' : h.status === 'CANCELLED' ? 'Résilié' : h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modale de confirmation de résiliation */}
      {showCancelModal && sub.active && (
        <div className="gm-back" onClick={() => !cancelling && setShowCancelModal(false)}>
          <style>{MODAL_CSS}</style>
          <div className="gm" onClick={(e) => e.stopPropagation()}>
            <div className="gm-head">
              <div className="gm-head-left">
                <div className="gm-head-icon" style={{ background: '#FBEAE7', color: '#C0392B' }}>
                  <AlertTriangle size={17} />
                </div>
                <h2 className="gm-title">Résilier l'abonnement</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="gm-close"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="gm-body">
              <p className="gm-note">
                Vous êtes sur le point de résilier votre formule{' '}
                <strong>{PLAN_LABELS[sub.active.plan]}</strong>.
              </p>

              <div className="gm-alert gm-alert--warn" style={{ display: 'block' }}>
                <p style={{ fontWeight: 700, margin: '0 0 10px' }}>Ce qui se passe après la résiliation :</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      Votre abonnement reste <strong>actif jusqu'au{' '}
                      {new Date(sub.active.endDate).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}</strong>
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    Vos collaborateurs conservent leur accès jusqu'à cette date
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#A5342A' }}>
                    <X size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    Après cette date, vous et vos collaborateurs n'aurez plus accès à la plateforme
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#A5342A' }}>
                    <X size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    Aucun remboursement pour la période en cours
                  </span>
                </div>
              </div>

              <p className="gm-hint">
                Vous pourrez souscrire à nouveau à tout moment depuis cette page.
              </p>
            </div>

            <div className="gm-foot">
              <button
                type="button"
                className="gm-btn gm-btn--ghost"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Annuler
              </button>
              <button
                type="button"
                className="gm-btn gm-btn--danger"
                onClick={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Résiliation…' : 'Confirmer la résiliation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
