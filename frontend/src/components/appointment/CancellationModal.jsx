import { useState } from 'react';
import { X, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const HOUR_MS = 60 * 60 * 1000;

// Politique dégressive (alignée sur le backend appointment.service.js) :
// ≥ 7 jours : 100% remboursé · 48h–7j : 50% remboursé · < 48h : aucun remboursement
const TIERS = [
  { id: 'FULL', label: 'Plus de 7 jours avant', detail: 'Remboursement intégral (100%)', rate: 1 },
  { id: 'PARTIAL', label: 'Entre 7 jours et 48h', detail: '50% remboursé — 35% conservé par le professionnel, 15% par la plateforme', rate: 0.5 },
  { id: 'NONE', label: 'Moins de 48h', detail: 'Aucun remboursement', rate: 0 },
];

export default function CancellationModal({ appointment, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const price = Number(appointment.coachService?.price || appointment.service?.price || 0);
  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';
  const isPaid = appointment.paymentStatus === 'paid';
  const hoursUntil = (new Date(appointment.scheduledAt).getTime() - Date.now()) / HOUR_MS;

  const activeTierId = hoursUntil >= 7 * 24 ? 'FULL' : hoursUntil >= 48 ? 'PARTIAL' : 'NONE';
  const activeTier = TIERS.find((t) => t.id === activeTierId);
  const refundAmount = (price * activeTier.rate).toFixed(2);

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
            <h2 className="text-lg font-semibold text-gray-900">Annuler le rendez-vous</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Appointment summary */}
          <div className="p-4 bg-white/[0.03] rounded-xl space-y-1 border border-white/[0.06]">
            <p className="font-medium text-gray-900">{serviceName}</p>
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

          {/* Politique dégressive — palier applicable surligné */}
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Politique d'annulation
              </p>
            </div>
            <div className="space-y-2">
              {TIERS.map((tier) => {
                const isActive = tier.id === activeTierId;
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      'flex items-start gap-2 p-2.5 rounded-lg text-sm border',
                      isActive
                        ? 'border-primary-300 bg-primary-50 text-primary-800'
                        : 'border-transparent text-gray-500'
                    )}
                  >
                    {isActive ? (
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-primary-600" />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <div>
                      <p className={cn('font-medium', isActive && 'text-primary-800')}>{tier.label}</p>
                      <p className="text-xs opacity-80">{tier.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isPaid && price > 0 && (
              <div className="border-t border-white/[0.06] pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total payé</span>
                  <span className="text-gray-900">{price.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={cn('font-medium', activeTier.rate > 0 ? 'text-green-500' : 'text-red-400')}>
                    Remboursement ({Math.round(activeTier.rate * 100)}%)
                  </span>
                  <span className="text-gray-900 font-semibold">{refundAmount} €</span>
                </div>
                {activeTier.rate > 0 && (
                  <p className="text-xs text-gray-500 pt-1">
                    Le remboursement sera crédité sur votre moyen de paiement sous 5-10 jours ouvrés.
                  </p>
                )}
              </div>
            )}

            {!isPaid && (
              <p className="text-xs text-gray-500 border-t border-white/[0.06] pt-3">
                Ce rendez-vous n'a pas encore été payé : l'annulation est sans frais.
              </p>
            )}
          </div>

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
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Retour
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleConfirm} loading={loading}>
            Confirmer l'annulation
          </Button>
        </div>
      </div>
    </div>
  );
}
