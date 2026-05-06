import { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { passkeyApi, isPasskeySupported } from '../services/passkey.api';

export default function PasskeyManager() {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const supported = isPasskeySupported();

  const load = async () => {
    try {
      const { data } = await passkeyApi.list();
      setPasskeys(data);
    } catch {
      toast.error('Impossible de charger les passkeys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supported) load();
    else setLoading(false);
  }, [supported]);

  const handleCreate = async () => {
    const nickname = window.prompt('Nom de cette passkey (ex: iPhone perso)', '');
    if (nickname === null) return;
    setCreating(true);
    try {
      await passkeyApi.register(nickname || null);
      toast.success('Passkey enregistrée !');
      await load();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.name === 'NotAllowedError' ? 'Création annulée.' : 'Erreur lors de la création.');
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette passkey ?')) return;
    try {
      await passkeyApi.remove(id);
      toast.success('Passkey supprimée');
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!supported) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-gray-400" />
          <p className="text-sm text-gray-500">
            Votre navigateur ne prend pas en charge les passkeys.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-brand-800" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Passkeys</h3>
            <p className="text-sm text-gray-500">
              Connectez-vous avec Face ID, Touch ID ou votre PIN — sans mot de passe.
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} loading={creating} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Aucune passkey enregistrée. Ajoutez-en une pour une connexion plus rapide et sécurisée.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {passkeys.map((pk) => (
            <li key={pk.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {pk.nickname || 'Passkey sans nom'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {pk.deviceType === 'multiDevice' ? 'Synchronisée' : 'Cet appareil'}
                    {pk.lastUsedAt
                      ? ` · Dernière utilisation ${new Date(pk.lastUsedAt).toLocaleDateString('fr-FR')}`
                      : ` · Créée ${new Date(pk.createdAt).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
