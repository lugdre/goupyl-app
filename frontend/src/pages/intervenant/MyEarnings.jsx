import { useState, useEffect } from 'react';
import { paymentApi } from '../../services/payment.api';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Euro, CreditCard, Calendar, Clock } from 'lucide-react';
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

export default function MyEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi
      .getMyEarnings()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const payments = data?.payments || [];
  const pending = data?.pending || [];
  const totalEarned = data?.totalEarned || 0;
  const totalPending = data?.totalPending || 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mes gains</h1>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            En attente de réalisation
          </h2>
          <div className="mb-2 px-1">
            <p className="text-sm text-gray-500">Ces séances sont payées. Le montant vous sera versé une fois la séance marquée comme terminée.</p>
          </div>
          <PaymentsTable rows={pending} emptyText="" />
        </div>
      )}

      {/* Earned section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Paiements encaissés</h2>
        <PaymentsTable rows={payments} emptyText="Aucun paiement encaissé pour le moment" />
      </div>
    </div>
  );
}
