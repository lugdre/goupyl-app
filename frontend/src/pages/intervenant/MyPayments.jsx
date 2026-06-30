import { useState, useEffect } from 'react';
import { paymentApi } from '../../services/payment.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { CreditCard, CheckCircle, AlertTriangle, ExternalLink, Euro, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

function PaymentsTable({ rows, emptyText }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <Euro className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">{emptyText}</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Client</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Service</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500">Votre part (70%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.appointmentId} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-900 font-medium">{p.clientName}</td>
                <td className="px-5 py-3 text-gray-600">{p.serviceName}</td>
                <td className="px-5 py-3 text-right text-gray-600">{(p.amount / 100).toFixed(2)} &euro;</td>
                <td className="px-5 py-3 text-right font-semibold text-green-700">{(p.intervenantShare / 100).toFixed(2)} &euro;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Section gains — montée uniquement quand le compte Stripe est actif.
function EarningsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi
      .getMyEarnings()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Erreur de chargement des gains'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const payments = data?.payments || [];
  const pending = data?.pending || [];
  const totalEarned = data?.totalEarned || 0;
  const totalPending = data?.totalPending || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mes gains</h2>
        <p className="text-gray-500 mt-1">Historique de vos paiements et montants en attente</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl shrink-0">
              <Euro className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total encaissé</p>
              <p className="text-2xl font-bold text-gray-900">{(totalEarned / 100).toFixed(2)} &euro;</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl shrink-0">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-amber-600">{(totalPending / 100).toFixed(2)} &euro;</p>
              <p className="text-xs text-gray-400 mt-0.5">Libéré après la séance</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-xl shrink-0">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Séances payées</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            En attente de réalisation
          </h3>
          <div className="mb-2 px-1">
            <p className="text-sm text-gray-500">Ces séances sont payées. Le montant vous sera versé une fois la séance marquée comme terminée.</p>
          </div>
          <PaymentsTable rows={pending} emptyText="" />
        </div>
      )}

      {/* Earned section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Paiements encaissés</h3>
        <PaymentsTable rows={payments} emptyText="Aucun paiement encaissé pour le moment" />
      </div>
    </div>
  );
}

export default function MyPayments() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const checkStatus = () => {
    setLoading(true);
    paymentApi
      .checkOnboardingStatus()
      .then(({ data }) => setStatus(data))
      .catch(() => toast.error('Erreur lors de la verification du statut'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleOnboard = async () => {
    setOnboarding(true);
    try {
      const { data } = await paymentApi.onboard();
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la configuration');
      setOnboarding(false);
    }
  };

  if (loading) return <Spinner />;

  const isActive = status?.status === 'active';

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Paiements &amp; gains</h1>
        <p className="text-gray-500 mt-1">Configurez votre compte de paiement, puis suivez vos gains</p>
      </div>

      {/* ── Paramétrage du compte Stripe (en haut) ───────────────── */}
      {isActive ? (
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Compte de paiement actif</h2>
              <p className="text-sm text-gray-500 mt-1">
                Votre compte Stripe est configuré et prêt à recevoir des paiements.
                Les clients peuvent désormais payer leurs séances en ligne.
              </p>
              <div className="mt-3 flex gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Paiements actifs
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Virements actifs
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : status?.status === 'pending' ? (
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">Verification en cours</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Votre compte Stripe est en cours de verification. Cela peut prendre quelques minutes.
                  Si la verification prend trop de temps, vous pouvez completer les informations manquantes.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={checkStatus}>
                  Rafraichir le statut
                </Button>
                <Button size="sm" onClick={handleOnboard} loading={onboarding}>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Completer les informations
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-50 rounded-xl">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">Configurez vos paiements</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pour recevoir les paiements de vos clients, vous devez connecter votre compte bancaire
                  via notre partenaire de paiement securise Stripe.
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comment ca marche</p>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    Cliquez sur le bouton ci-dessous pour creer votre compte Stripe
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    Renseignez vos informations bancaires en toute sécurité
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    Recevez 70% du montant de chaque séance directement sur votre compte
                  </li>
                </ul>
              </div>
              <Button onClick={handleOnboard} loading={onboarding}>
                <CreditCard className="w-4 h-4 mr-2" />
                Configurer les paiements
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Gains (en dessous, une fois le compte actif) ─────────── */}
      {isActive && (
        <>
          <div className="border-t border-gray-100" />
          <EarningsSection />
        </>
      )}
    </div>
  );
}
