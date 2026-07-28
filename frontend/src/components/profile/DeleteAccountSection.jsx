import { useState } from 'react';
import { userApi } from '../../services/user.api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

export default function DeleteAccountSection() {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'SUPPRIMER') {
      toast.error('Veuillez taper SUPPRIMER pour confirmer.');
      return;
    }
    setDeleting(true);
    try {
      await userApi.deleteMe();
      toast.success('Votre compte a été supprimé.');
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression du compte.');
      setDeleting(false);
    }
  };

  return (
    <div className="dsh-card" style={{ borderColor: '#EFC7BE', background: '#FDF7F5' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FBEAE7', color: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={19} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="dsh-card-title">Supprimer mon compte</h2>
          <p className="dsh-card-sub" style={{ marginBottom: 18, maxWidth: 560, lineHeight: 1.55 }}>
            La suppression de votre compte est définitive. Toutes vos données personnelles, vos documents
            et votre historique de rendez-vous seront effacés. Cette action est irréversible
            (conformément au RGPD).
          </p>

          {!confirming ? (
            <button type="button" className="dsh-btn dsh-btn--danger" onClick={() => setConfirming(true)}>
              Je souhaite supprimer mon compte
            </button>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #EFC7BE', borderRadius: 14, padding: 18 }}>
              <label className="dsh-label" htmlFor="deleteConfirm">
                Pour confirmer la suppression, tapez <strong>SUPPRIMER</strong> ci-dessous :
              </label>
              <input
                id="deleteConfirm"
                type="text"
                className="dsh-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                style={{ marginBottom: 14 }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dsh-btn dsh-btn--ghost"
                  onClick={() => { setConfirming(false); setConfirmText(''); }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="dsh-btn dsh-btn--danger-solid"
                  onClick={handleDelete}
                  disabled={deleting || confirmText !== 'SUPPRIMER'}
                >
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
