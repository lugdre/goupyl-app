import { useState } from 'react';
import { X, Scale } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import { MODAL_CSS } from '../ui/modalStyles';
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
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon" style={{ background: '#FBF3E2', color: '#A87616' }}>
              <Scale size={17} />
            </div>
            <h2 className="gm-title">Contester l'absence</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gm-body">
          <div className="gm-summary">
            <p className="gm-summary-name">{serviceName}</p>
            <p className="gm-summary-line">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <p className="gm-note">
            Le professionnel a signalé votre absence à cette séance. Si vous étiez présent(e),
            expliquez la situation : notre équipe arbitrera et, le cas échéant, vous serez
            intégralement remboursé(e).
          </p>

          <div>
            <label className="gm-label" htmlFor="disputeReason">
              Votre explication <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <textarea
              id="disputeReason"
              className="gm-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Décrivez ce qui s'est passé (10 caractères minimum)..."
              rows={4}
              maxLength={500}
            />
            <p className="gm-count">{reason.length}/500</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="gm-btn gm-btn--ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Retour
            </button>
            <button type="submit" className="gm-btn gm-btn--orange" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Envoi…' : 'Ouvrir le litige'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
