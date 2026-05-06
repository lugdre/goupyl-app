import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscriptionApi } from '../../services/subscription.api';
import { paymentApi } from '../../services/payment.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { CreditCard, CheckCircle } from 'lucide-react';
import { PLAN_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const ENTERPRISE_PLANS = [
  {
    value: 'ZEN_ENTREPRISE',
    priceMonthly: 540,
    priceYearly: 432,
    features: ["Jusqu'à 10 salariés", '1 séance / semaine', 'Sport + Bien-être', 'Support dédié'],
  },
  {
    value: 'PULSE_ENTREPRISE',
    priceMonthly: 1060,
    priceYearly: 848,
    popular: true,
    features: ["Jusqu'à 50 salariés", '2 séances / semaine', 'Tous les domaines', 'Account manager'],
  },
  {
    value: 'BOOST_ENTREPRISE',
    priceMonthly: 2199,
    priceYearly: 1759,
    features: ["Jusqu'à 200 salariés", '4 séances / semaine', 'Tous les domaines', 'SLA garanti'],
  },
];

export default function MySubscription() {
  const [data, setData] = useState({ active: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchData = () => {
    subscriptionApi.getMine()
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (payment === 'success' && sessionId) {
      setSearchParams({});
      paymentApi.verifySession(sessionId)
        .then(() => {
          toast.success('Paiement confirmé ! Votre abonnement est actif.');
          fetchData();
        })
        .catch(() => {
          toast.error('Paiement reçu mais activation échouée. Contactez le support.');
          fetchData();
        });
      return;
    } else if (payment === 'cancelled') {
      toast('Paiement annulé.');
      setSearchParams({});
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = async (plan) => {
    setCheckingOut(plan);
    try {
      const response = await paymentApi.createCheckout(plan, billingCycle);
      const url = response.data?.url;
      if (!url) throw new Error('URL de paiement non reçue.');
      window.location.href = url;
    } catch (err) {
      console.error('[Stripe checkout error]', err);
      const message = err.response?.data?.message || err.message || 'Erreur lors de la création du paiement.';
      toast.error(message, { duration: 5000 });
      setCheckingOut(null);
    }
  };

  const handleCancel = async () => {
    if (!data.active || !window.confirm('Résilier votre abonnement ?')) return;
    try {
      await subscriptionApi.cancel(data.active.id);
      toast.success('Abonnement résilié');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <Spinner />;

  const isYearly = billingCycle === 'YEARLY';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mon abonnement</h1>
        <p className="text-gray-500 mt-1">Gérez la formule de votre entreprise</p>
      </div>

      {data.active ? (
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 rounded-lg shrink-0">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Formule {PLAN_LABELS[data.active.plan]}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {data.active.billingCycle === 'YEARLY' ? 'Facturation annuelle' : 'Facturation mensuelle'} · Valable jusqu'au{' '}
                  {new Date(data.active.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {data.active.status === 'CANCELLED' ? (
                <Badge variant="warning">Résilié</Badge>
              ) : (
                <Badge variant="ACTIVE">Actif</Badge>
              )}
              {data.active.status === 'ACTIVE' && (
                <Button variant="ghost" size="sm" onClick={handleCancel}>Résilier</Button>
              )}
              {data.active.status === 'CANCELLED' && (
                <p className="text-xs text-amber-600 font-medium">
                  Accès jusqu'au {new Date(data.active.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-gray-500 text-sm">Vous n'avez pas d'abonnement actif.</p>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Choisir une formule</h2>

        <div className="flex items-center gap-3 mb-6">
          <span className={cn('text-sm font-medium', !isYearly ? 'text-gray-900' : 'text-gray-400')}>Mensuel</span>
          <button
            onClick={() => setBillingCycle(isYearly ? 'MONTHLY' : 'YEARLY')}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
              isYearly ? 'bg-primary-600' : 'bg-gray-200'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow',
              isYearly ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
          <span className={cn('text-sm font-medium', isYearly ? 'text-gray-900' : 'text-gray-400')}>Annuel</span>
          {isYearly && (
            <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">-20%</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ENTERPRISE_PLANS.map((plan) => {
            const isActive = data.active?.plan === plan.value;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            return (
              <Card
                key={plan.value}
                className={cn(
                  'relative',
                  isActive ? 'border-primary-600 ring-1 ring-primary-600' : '',
                  plan.popular ? 'border-primary-400' : ''
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Le plus populaire
                    </span>
                  </div>
                )}
                <p className="font-semibold text-gray-900 mt-2">{PLAN_LABELS[plan.value]}</p>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold text-primary-700">{price}€</span>
                  <span className="text-sm text-gray-500">/mois</span>
                  {isYearly && (
                    <p className="text-xs text-gray-400 mt-0.5">facturé {price * 12}€/an</p>
                  )}
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isActive ? 'ghost' : 'primary'}
                  size="sm"
                  className="w-full"
                  disabled={isActive}
                  loading={checkingOut === plan.value}
                  onClick={() => !isActive && handleCheckout(plan.value)}
                >
                  {isActive ? 'Actif' : 'S\'abonner'}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Paiement sécurisé par Stripe. Carte de test : 4242 4242 4242 4242 · exp. 12/34 · CVC 123
        </p>
      </div>
    </div>
  );
}
