import QRCode from 'react-qr-code';
import { X, QrCode as QrCodeIcon } from 'lucide-react';
import Button from '../ui/Button';

// Le client présente ce QR (ou le code court) au professionnel pour valider
// sa présence à la séance.
export default function QrCodeModal({ appointment, onClose }) {
  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';
  const shortCode = appointment.qrToken?.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <QrCodeIcon className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">QR de la séance</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 bg-white/[0.03] rounded-xl space-y-1 border border-white/[0.06]">
            <p className="font-medium text-gray-900">{serviceName}</p>
            <p className="text-sm text-gray-500">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 py-2">
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={appointment.qrToken} size={200} />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Ou communiquez ce code au professionnel :</p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-gray-900">{shortCode}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Présentez ce code au professionnel au début de la séance pour valider votre présence.
          </p>
        </div>

        <div className="px-5 pb-5">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
