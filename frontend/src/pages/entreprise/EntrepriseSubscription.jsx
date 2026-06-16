import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscriptionApi } from '../../services/subscription.api';
import { companyApi } from '../../services/company.api';
import { paymentApi } from '../../services/payment.api';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { CreditCard, Users, Activity, CheckCircle, TrendingUp, AlertTriangle, X } from 'lucide-react';
import { PLAN_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

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

function UsageBar({ label, icon: Icon, used, max }) {
  const unlimited = max === null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const danger = !unlimited && pct >= 90;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-600 font-medium">
          <Icon className="w-4 h-4 text-primary-500" />
          {label}
        </span>
        <span className={cn('font-semibold', danger ? 'text-red-600' : 'text-gray-800')}>
          {unlimited ? `${used} / Illimité` : `${used} / ${max}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', danger ? 'bg-red-500' : 'bg-primary-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="h-2 bg-primary-100 rounded-full">
          <div className="h-full w-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full opacity-30" />
        </div>
      )}
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

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const isYearly = billingCycle === 'YEARLY';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mon abonnement</h1>
        <p className="text-gray-500 mt-1">Gérez votre formule et suivez votre consommation</p>
      </div>

      {/* Current plan + usage */}
      {sub.active ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 rounded-xl shrink-0">
                <CreditCard className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">Formule {PLAN_LABELS[sub.active.plan]}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {sub.active.billingCycle === 'YEARLY' ? 'Facturation annuelle' : 'Facturation mensuelle'} · Renouvellement le{' '}
                  {new Date(sub.active.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sub.active.status === 'CANCELLED' ? (
                <Badge variant="warning">Résilié</Badge>
              ) : (
                <Badge variant="ACTIVE">Actif</Badge>
              )}
              {sub.active.status === 'ACTIVE' && (
                <Button variant="ghost" size="sm" onClick={handleCancel}>Résilier</Button>
              )}
            </div>
          </div>

          {usage && (
            <div className="border-t pt-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <p className="text-sm font-semibold text-gray-700">Utilisation ce mois-ci</p>
              </div>
              <UsageBar
                label="Collaborateurs"
                icon={Users}
                used={usage.employeeCount}
                max={usage.limits.maxEmployees}
              />
              <UsageBar
                label="Séances réservées"
                icon={Activity}
                used={usage.sessionCount}
                max={usage.limits.maxSessions}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-gray-500 text-sm">Vous n'avez pas d'abonnement actif.</p>
        </div>
      )}

      {/* Plan picker */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {sub.active ? 'Changer de formule' : 'Choisir une formule'}
          </h2>
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-medium', !isYearly ? 'text-gray-900' : 'text-gray-400')}>Mensuel</span>
            <button
              onClick={() => setBillingCycle(isYearly ? 'MONTHLY' : 'YEARLY')}
              className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', isYearly ? 'bg-primary-600' : 'bg-gray-200')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow', isYearly ? 'translate-x-5' : 'translate-x-0')} />
            </button>
            <span className={cn('text-sm font-medium', isYearly ? 'text-gray-900' : 'text-gray-400')}>Annuel</span>
            {isYearly && <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">-20%</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ENTERPRISE_PLANS.map((plan) => {
            const isActive = sub.active?.plan === plan.value;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            return (
              <div
                key={plan.value}
                className={cn(
                  'relative bg-white rounded-2xl border p-5',
                  isActive ? 'border-primary-600 ring-1 ring-primary-600' : 'border-gray-200',
                  plan.popular ? 'border-primary-400' : ''
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">Le plus populaire</span>
                  </div>
                )}
                <p className="font-semibold text-gray-900 mt-2">{PLAN_LABELS[plan.value]}</p>
                <div className="mt-2 mb-4">
                  {plan.quote ? (
                    <>
                      <span className="text-2xl font-bold text-primary-700">Sur devis</span>
                      <p className="text-xs text-gray-400 mt-0.5">Adapté à votre périmètre</p>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-primary-700">{price}€</span>
                      <span className="text-sm text-gray-500">/ collaborateur / mois</span>
                      {isYearly && <p className="text-xs text-gray-400 mt-0.5">facturé {price * 12}€/collaborateur/an</p>}
                    </>
                  )}
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {plan.quote ? (
                  <a href="/#demo" className="block">
                    <Button variant="primary" size="sm" className="w-full">Demander un devis</Button>
                  </a>
                ) : (
                  <Button
                    variant={isActive ? 'ghost' : 'primary'}
                    size="sm"
                    className="w-full"
                    disabled={isActive}
                    loading={checkingOut === plan.value}
                    onClick={() => !isActive && handleCheckout(plan.value)}
                  >
                    {isActive ? 'Actif' : sub.active ? 'Changer' : "S'abonner"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Paiement sécurisé par Stripe{import.meta.env.DEV && ' · Carte de test : 4242 4242 4242 4242 · exp. 12/34 · CVC 123'}
        </p>
      </div>

      {/* History */}
      {sub.history?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Historique</h2>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {sub.history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-gray-700">{PLAN_LABELS[h.plan]}</span>
                <span className="text-gray-400">{new Date(h.startDate).toLocaleDateString('fr-FR')} → {new Date(h.endDate).toLocaleDateString('fr-FR')}</span>
                <Badge variant={h.status}>{h.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmation de résiliation */}
      {showCancelModal && sub.active && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Résilier l'abonnement</h2>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Vous êtes sur le point de résilier votre formule{' '}
                <span className="font-semibold">{PLAN_LABELS[sub.active.plan]}</span>.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">Ce qui se passe après la résiliation :</p>
                <ul className="text-sm text-amber-700 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    Votre abonnement reste <strong>actif jusqu'au{' '}
                    {new Date(sub.active.endDate).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    Vos collaborateurs conservent leur accès jusqu'à cette date
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    Après cette date, vous et vos collaborateurs n'aurez plus accès à la plateforme
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    Aucun remboursement pour la période en cours
                  </li>
                </ul>
              </div>

              <p className="text-sm text-gray-500">
                Vous pourrez souscrire à nouveau à tout moment depuis cette page.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={cancelling}
                onClick={confirmCancel}
              >
                Confirmer la résiliation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
