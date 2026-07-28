import { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
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
      <div className="dsh-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KeyRound size={18} style={{ color: '#8a8781' }} />
          <p className="dsh-card-sub" style={{ margin: 0 }}>
            Votre navigateur ne prend pas en charge les passkeys.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dsh-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FEF1EA', color: '#F4530F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={19} />
          </div>
          <div>
            <h3 className="dsh-card-title">Passkeys</h3>
            <p className="dsh-card-sub">
              Connectez-vous avec Face ID, Touch ID ou votre PIN — sans mot de passe.
            </p>
          </div>
        </div>
        <button type="button" onClick={handleCreate} disabled={creating} className="dsh-btn dsh-btn--orange dsh-btn--sm">
          <Plus size={14} />
          {creating ? 'Création…' : 'Ajouter'}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : passkeys.length === 0 ? (
        <p className="dsh-card-sub" style={{ textAlign: 'center', padding: '18px 0', margin: 0 }}>
          Aucune passkey enregistrée. Ajoutez-en une pour une connexion plus rapide et sécurisée.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {passkeys.map((pk) => (
            <li key={pk.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #E4E2DC', borderRadius: 12, padding: '13px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <KeyRound size={15} style={{ color: '#8a8781', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#171614', margin: 0 }}>
                    {pk.nickname || 'Passkey sans nom'}
                  </p>
                  <p style={{ fontSize: 12, color: '#8a8781', margin: '2px 0 0' }}>
                    {pk.deviceType === 'multiDevice' ? 'Synchronisée' : 'Cet appareil'}
                    {pk.lastUsedAt
                      ? ` · Dernière utilisation ${new Date(pk.lastUsedAt).toLocaleDateString('fr-FR')}`
                      : ` · Créée ${new Date(pk.createdAt).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(pk.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', border: '1px solid #E4E2DC', background: '#fff', color: '#8a8781', cursor: 'pointer', flexShrink: 0 }}
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
