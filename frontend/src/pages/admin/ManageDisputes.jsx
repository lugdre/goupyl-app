import { useState, useEffect } from 'react';
import { appointmentApi } from '../../services/appointment.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Scale, CheckCircle, XCircle, Euro } from 'lucide-react';
import { DISPUTE_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const FILTERS = [
  ['OPEN', 'En cours'],
  ['ALL', 'Tous'],
];

export default function ManageDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  const [resolvingId, setResolvingId] = useState(null);

  const fetchDisputes = () => {
    setLoading(true);
    appointmentApi
      .getDisputes({ status: filter })
      .then(({ data }) => setDisputes(data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDisputes, [filter]);

  const handleResolve = async (dispute, resolution) => {
    const label = resolution === 'REJECTED'
      ? "Rejeter le litige : l'absence signalée par le coach est confirmée et ses gains sont débloqués."
      : 'Donner raison au client : la séance payée sera intégralement remboursée.';
    if (!window.confirm(label + '\n\nConfirmer ?')) return;

    setResolvingId(dispute.id);
    try {
      await appointmentApi.resolveDispute(dispute.id, resolution);
      toast.success('Litige résolu — les deux parties sont notifiées');
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la résolution');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Litiges</h1>
        <p className="text-gray-500 mt-1">
          Contestations d'absence — le virement au professionnel est gelé tant que le litige est ouvert
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'text-gray-600 border-gray-300 hover:border-primary-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : disputes.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Scale className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun litige {filter === 'OPEN' ? 'en cours' : ''}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {disputes.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {d.coachService?.name || d.service?.name || 'Séance'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(d.scheduledAt).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge variant={d.disputeStatus === 'OPEN' ? 'PENDING' : 'DONE'}>
                  {DISPUTE_STATUS_LABELS[d.disputeStatus]}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
                  <p className="text-gray-900 font-medium">{d.client.firstName} {d.client.lastName}</p>
                  <p className="text-gray-500 text-xs">{d.client.email}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Professionnel</p>
                  <p className="text-gray-900 font-medium">{d.intervenant.firstName} {d.intervenant.lastName}</p>
                  <p className="text-gray-500 text-xs">{d.intervenant.email}</p>
                </div>
              </div>

              {d.disputeReason && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mb-3">
                  <p className="text-xs text-amber-600 uppercase tracking-wide mb-0.5 font-semibold">
                    Contestation du client
                  </p>
                  <p className="text-sm text-gray-700 italic">"{d.disputeReason}"</p>
                  {d.disputedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Ouvert le {new Date(d.disputedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {d.payment && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                  <Euro className="w-4 h-4 text-gray-400" />
                  Montant payé : <span className="font-semibold">{(d.payment.amount / 100).toFixed(2)} €</span>
                  {' '}(part coach {(d.payment.intervenantShare / 100).toFixed(2)} €)
                  {d.payment.refundAmount != null && (
                    <span className="text-green-600 font-medium"> · remboursé {(d.payment.refundAmount / 100).toFixed(2)} €</span>
                  )}
                </p>
              )}
              {!d.payment && d.coveredByCompany && (
                <p className="text-sm text-gray-500 mb-3">Séance couverte par l'entreprise (aucun paiement direct).</p>
              )}

              {d.disputeStatus === 'OPEN' && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={resolvingId === d.id}
                    onClick={() => handleResolve(d, 'REJECTED')}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Rejeter (absence confirmée)
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    loading={resolvingId === d.id}
                    onClick={() => handleResolve(d, 'RESOLVED_CLIENT')}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Donner raison au client{d.payment ? ' (remboursement intégral)' : ''}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
