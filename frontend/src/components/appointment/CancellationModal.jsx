import { useState } from 'react';
import { X, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const HOURS_48 = 48 * 60 * 60 * 1000;

export default function CancellationModal({ appointment, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const price = Number(appointment.coachService?.price || appointment.service?.price || 0);
  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';
  const isPaid = appointment.paymentStatus === 'paid';
  const timeUntil = new Date(appointment.scheduledAt).getTime() - Date.now();
  const canCancel = timeUntil >= HOURS_48;

  const refundAmount   = (price * 0.35).toFixed(2);
  const coachRetains   = (price * 0.30).toFixed(2);
  const platformRetains = (price * 0.35).toFixed(2);

  const cancelDeadline = new Date(new Date(appointment.scheduledAt).getTime() - HOURS_48);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await appointmentApi.cancel(appointment.id, reason || undefined);
      toast.success('Rendez-vous annulé');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Annuler le rendez-vous</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Appointment summary */}
          <div className="p-4 bg-white/[0.03] rounded-xl space-y-1 border border-white/[0.06]">
            <p className="font-medium text-white">{serviceName}</p>
            <p className="text-sm text-gray-500">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {/* Too late banner */}
          {!canCancel ? (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <Clock className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Annulation impossible</p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  La séance commence dans moins de 48h. Le délai d'annulation est dépassé.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Deadline reminder */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Annulation possible jusqu'au{' '}
                  <span className="text-gray-400 font-medium">
                    {cancelDeadline.toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>

              {/* Refund breakdown (if paid) */}
              {isPaid && price > 0 && (
                <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary-400" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Politique de remboursement
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400 font-medium">35% remboursé (vous)</span>
                      <span className="text-white font-semibold">{refundAmount} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">30% au professionnel</span>
                      <span className="text-gray-400">{coachRetains} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">35% plateforme</span>
                      <span className="text-gray-400">{platformRetains} €</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-2 flex justify-between text-sm">
                      <span className="text-gray-500">Total payé</span>
                      <span className="text-white">{price.toFixed(2)} €</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Le remboursement de <span className="text-white font-medium">{refundAmount} €</span> sera
                    crédité sur votre moyen de paiement sous 5-10 jours ouvrés.
                  </p>
                </div>
              )}

              {!isPaid && (
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <p className="text-sm text-gray-400">
                    Ce rendez-vous n'a pas encore été payé. L'annulation est gratuite.
                  </p>
                </div>
              )}

              {/* Optional reason */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Motif d'annulation <span className="text-gray-600">(optionnel)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Indiquez un motif si vous le souhaitez..."
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-colors"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Retour
          </Button>
          {canCancel && (
            <Button variant="danger" className="flex-1" onClick={handleConfirm} loading={loading}>
              Confirmer l'annulation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
