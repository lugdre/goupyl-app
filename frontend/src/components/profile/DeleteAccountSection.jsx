import { useState } from 'react';
import { userApi } from '../../services/user.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
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
    <div className="bg-surface rounded-2xl border border-red-500/20 p-6 mt-8 overflow-hidden relative" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
      <div className="flex items-start gap-4">
        <div className="bg-red-500/10 p-2.5 rounded-xl shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">Zone de danger : Supprimer mon compte</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            La suppression de votre compte est définitive. Toutes vos données personnelles, vos documents et votre historique de rendez-vous seront effacés. Cette action est irréversible (conformément au RGPD).
          </p>

          {!confirming ? (
            <Button
              variant="ghost"
              onClick={() => setConfirming(true)}
              className="text-red-400 border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              Je souhaite supprimer mon compte
            </Button>
          ) : (
            <div className="bg-white/[0.03] p-4.5 rounded-xl border border-white/[0.07] mt-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Pour confirmer la suppression, veuillez taper <strong>SUPPRIMER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 transition-shadow text-sm text-gray-900 placeholder-gray-400"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => { setConfirming(false); setConfirmText(''); }}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleting}
                  disabled={confirmText !== 'SUPPRIMER'}
                >
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
