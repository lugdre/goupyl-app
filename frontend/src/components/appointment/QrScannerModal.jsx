import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine, Camera } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import { MODAL_CSS } from '../ui/modalStyles';
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
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon"><ScanLine size={17} /></div>
            <h2 className="gm-title">Valider une séance</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="gm-body">
          {/* Zone caméra */}
          <div style={{ borderRadius: 14, overflow: 'hidden', background: '#191917' }}>
            <div id="qr-reader" style={{ width: '100%' }} />
            {cameraError && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '34px 24px', textAlign: 'center' }}>
                <Camera size={24} style={{ color: 'rgba(255,255,255,.6)' }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', margin: 0, lineHeight: 1.5 }}>
                  Caméra indisponible — utilisez la saisie manuelle ci-dessous.
                </p>
              </div>
            )}
          </div>

          {/* Saisie manuelle (repli) */}
          <form onSubmit={handleManualSubmit}>
            <label className="gm-label" htmlFor="manualCode">
              …ou saisissez le code communiqué par le client (8 caractères)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="manualCode"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="EX : A1B2C3D4"
                maxLength={64}
                style={{
                  flex: 1, minWidth: 0, height: 46, padding: '0 15px',
                  border: '1px solid #E4E2DC', borderRadius: 12, background: '#fff',
                  fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
                  letterSpacing: '.16em', textTransform: 'uppercase',
                  color: '#171614', outline: 'none',
                }}
              />
              <button type="submit" className="gm-btn gm-btn--orange" disabled={validating}>
                {validating ? 'Validation…' : 'Valider'}
              </button>
            </div>
          </form>

          <p className="gm-hint">
            La validation confirme la présence du client et clôture la séance.
          </p>
        </div>
      </div>
    </div>
  );
}
