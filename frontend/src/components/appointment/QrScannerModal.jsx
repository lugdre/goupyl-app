import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine, Camera } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

// Le coach scanne le QR du client (ou saisit le code court à 8 caractères)
// pour valider la séance : passage en DONE avec présence confirmée.
export default function QrScannerModal({ onClose, onValidated }) {
  const [manualCode, setManualCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef(null);
  const validatingRef = useRef(false);

  const validate = async (code) => {
    if (validatingRef.current) return;
    validatingRef.current = true;
    setValidating(true);
    try {
      const { data } = await appointmentApi.validateQr(code);
      toast.success(`Séance validée — ${data.client?.firstName || 'client'} présent(e)`);
      onValidated?.();
      onClose();
    } catch (err) {
      const apiError = err.response?.data;
      if (apiError?.error === 'PAYMENT_REQUIRED') {
        toast.error('Le client doit payer la séance avant validation.');
      } else {
        toast.error(apiError?.message || 'Code invalide ou séance introuvable.');
      }
      validatingRef.current = false;
      setValidating(false);
    }
  };

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => validate(decodedText)
      )
      .catch(() => setCameraError(true));

    return () => {
      const s = scannerRef.current;
      if (s && s.isScanning) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code.length < 8) {
      toast.error('Le code fait au moins 8 caractères.');
      return;
    }
    validate(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Valider une séance</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Zone caméra */}
          <div className="rounded-xl overflow-hidden bg-black/80">
            <div id="qr-reader" className="w-full" />
            {cameraError && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Camera className="w-6 h-6 text-gray-400" />
                <p className="text-sm text-gray-300 px-6">
                  Caméra indisponible — utilisez la saisie manuelle ci-dessous.
                </p>
              </div>
            )}
          </div>

          {/* Saisie manuelle (fallback) */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-medium text-gray-500">
              …ou saisissez le code communiqué par le client (8 caractères)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="EX: A1B2C3D4"
                maxLength={64}
                className="flex-1 font-mono tracking-widest uppercase bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20"
              />
              <Button type="submit" loading={validating}>
                Valider
              </Button>
            </div>
          </form>

          <p className="text-xs text-gray-500">
            La validation confirme la présence du client et clôture la séance.
          </p>
        </div>
      </div>
    </div>
  );
}
