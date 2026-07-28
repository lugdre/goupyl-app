import { useState } from 'react';
import { X, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import { MODAL_CSS } from '../ui/modalStyles';
import toast from 'react-hot-toast';

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
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon" style={{ background: '#FBF3E2', color: '#A87616' }}>
              <AlertTriangle size={17} />
            </div>
            <h2 className="gm-title">Annuler le rendez-vous</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="gm-body">
          {/* Récapitulatif */}
          <div className="gm-summary">
            <p className="gm-summary-name">{serviceName}</p>
            <p className="gm-summary-line">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="gm-summary-line">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {/* Politique dégressive — palier applicable surligné */}
          <div>
            <p className="gm-eyebrow"><RefreshCw size={13} /> Politique d'annulation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TIERS.map((tier) => {
                const isActive = tier.id === activeTierId;
                return (
                  <div
                    key={tier.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 9,
                      padding: '11px 14px', borderRadius: 12,
                      border: `1px solid ${isActive ? '#F7D3C0' : '#E4E2DC'}`,
                      background: isActive ? '#FEF1EA' : '#fff',
                    }}
                  >
                    {isActive ? (
                      <Check size={15} style={{ color: '#F4530F', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <span style={{ width: 15, flexShrink: 0 }} />
                    )}
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: isActive ? '#B33D0A' : '#171614' }}>
                        {tier.label}
                      </p>
                      <p style={{ fontSize: 12, margin: '3px 0 0', color: isActive ? '#B33D0A' : '#8a8781', opacity: isActive ? .85 : 1 }}>
                        {tier.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isPaid && price > 0 && (
              <div style={{ borderTop: '1px solid #E4E2DC', paddingTop: 14, marginTop: 14 }}>
                <div className="gm-row">
                  <span>Total payé</span>
                  <span>{price.toFixed(2)} €</span>
                </div>
                <div className="gm-row">
                  <span style={{ color: activeTier.rate > 0 ? '#2F7A47' : '#C0392B', fontWeight: 600 }}>
                    Remboursement ({Math.round(activeTier.rate * 100)}%)
                  </span>
                  <span>{refundAmount} €</span>
                </div>
                {activeTier.rate > 0 && (
                  <p className="gm-hint" style={{ marginTop: 10 }}>
                    Le remboursement sera crédité sur votre moyen de paiement sous 5-10 jours ouvrés.
                  </p>
                )}
              </div>
            )}

            {!isPaid && (
              <p className="gm-hint" style={{ borderTop: '1px solid #E4E2DC', paddingTop: 14, marginTop: 14 }}>
                Ce rendez-vous n'a pas encore été payé : l'annulation est sans frais.
              </p>
            )}
          </div>

          {/* Motif optionnel */}
          <div>
            <label className="gm-label" htmlFor="cancelReason">
              Motif d'annulation <em>(optionnel)</em>
            </label>
            <textarea
              id="cancelReason"
              className="gm-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez un motif si vous le souhaitez..."
              rows={2}
            />
          </div>
        </div>

        <div className="gm-foot">
          <button type="button" className="gm-btn gm-btn--ghost" onClick={onClose} disabled={loading}>
            Retour
          </button>
          <button type="button" className="gm-btn gm-btn--danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Annulation…' : "Confirmer l'annulation"}
          </button>
        </div>
      </div>
    </div>
  );
}
