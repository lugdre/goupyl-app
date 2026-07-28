import QRCode from 'react-qr-code';
import { X, QrCode as QrCodeIcon } from 'lucide-react';
import { MODAL_CSS } from '../ui/modalStyles';

// Le client présente ce QR (ou le code court) au professionnel pour valider
// sa présence à la séance.
export default function QrCodeModal({ appointment, onClose }) {
  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';
  const shortCode = appointment.qrToken?.slice(0, 8).toUpperCase();

  return (
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon"><QrCodeIcon size={17} /></div>
            <h2 className="gm-title">QR de la séance</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="gm-body">
          <div className="gm-summary">
            <p className="gm-summary-name">{serviceName}</p>
            <p className="gm-summary-line">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="gm-summary-line">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ background: '#fff', border: '1px solid #E4E2DC', borderRadius: 16, padding: 18 }}>
              <QRCode value={appointment.qrToken} size={190} fgColor="#171614" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className="gm-hint" style={{ marginBottom: 6 }}>
                Ou communiquez ce code au professionnel :
              </p>
              <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.24em', color: '#F4530F', margin: 0 }}>
                {shortCode}
              </p>
            </div>
          </div>

          <p className="gm-hint" style={{ textAlign: 'center' }}>
            Présentez ce code au professionnel au début de la séance pour valider votre présence.
          </p>
        </div>

        <div className="gm-foot">
          <button type="button" className="gm-btn gm-btn--ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
