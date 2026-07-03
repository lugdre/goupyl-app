import { useState } from 'react';
import { X, Scale } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

// Le client conteste une absence signalée par le coach : ouvre un litige
// arbitré par l'équipe Goupyl Sport (virement au coach gelé en attendant).
export default function DisputeModal({ appointment, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      toast.error('Décrivez votre contestation (10 caractères minimum).');
      return;
    }
    setLoading(true);
    try {
      await appointmentApi.openDispute(appointment.id, reason.trim());
      toast.success('Litige ouvert — notre équipe va examiner votre demande.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'ouverture du litige");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-gray-900">Contester l'absence</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-4 bg-white/[0.03] rounded-xl space-y-1 border border-white/[0.06]">
            <p className="font-medium text-gray-900">{serviceName}</p>
            <p className="text-sm text-gray-500">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Le professionnel a signalé votre absence à cette séance. Si vous étiez présent(e),
            expliquez la situation : notre équipe arbitrera et, le cas échéant, vous serez
            intégralement remboursé(e).
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Votre explication <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Décrivez ce qui s'est passé (10 caractères minimum)..."
              rows={4}
              maxLength={500}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
              Retour
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Ouvrir le litige
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
