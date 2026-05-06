import { useState, useEffect, useCallback } from 'react';
import { companyApi } from '../../services/company.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Users, Copy, RefreshCw, Mail, Trash2, UserMinus, Check } from 'lucide-react';

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [invites, setInvites] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, invRes, codeRes] = await Promise.all([
        companyApi.getEmployees(),
        companyApi.getInvites(),
        companyApi.getJoinCode(),
      ]);
      setEmployees(empRes.data);
      setInvites(invRes.data);
      setJoinCode(codeRes.data.joinCode);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Régénérer le code ? L\'ancien ne fonctionnera plus.')) return;
    try {
      const { data } = await companyApi.regenerateJoinCode();
      setJoinCode(data.joinCode);
      toast.success('Code régénéré');
    } catch {
      toast.error('Erreur lors de la régénération');
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setSendingInvite(true);
    try {
      const { data } = await companyApi.createInvite(inviteEmail);
      setInvites((prev) => [data, ...prev]);
      setInviteEmail('');
      toast.success(`Invitation créée pour ${data.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleDeleteInvite = async (id) => {
    try {
      await companyApi.deleteInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast.success('Invitation supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRemoveEmployee = async (id, name) => {
    if (!confirm(`Retirer ${name} de votre entreprise ?`)) return;
    try {
      await companyApi.removeEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success(`${name} retiré`);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-600" />
          Mes salariés
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {employees.length} salarié{employees.length !== 1 ? 's' : ''} rattaché{employees.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Code d'accès */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Code d'accès entreprise</h2>
        <p className="text-sm text-gray-500 mb-4">
          Partagez ce code avec vos salariés pour qu'ils puissent rejoindre votre espace lors de leur inscription.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-xl font-bold text-gray-900 tracking-widest text-center">
            {joinCode}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            title="Copier"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={handleRegenerate}
            className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
            title="Régénérer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Invitations par email */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Invitations par email</h2>
        <form onSubmit={handleSendInvite} className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="prenom.nom@entreprise.fr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
            />
          </div>
          <Button type="submit" loading={sendingInvite}>
            <Mail className="w-4 h-4 mr-1.5" />
            Inviter
          </Button>
        </form>

        {invites.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune invitation en attente</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">En attente</p>
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    Token : <span className="font-mono">{inv.token}</span> · Expire le {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteInvite(inv.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-3"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Liste des salariés */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Salariés actifs</h2>
        {employees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucun salarié rattaché</p>
            <p className="text-gray-400 text-xs mt-1">Partagez le code ci-dessus ou envoyez des invitations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-gray-400">{emp.email} · Depuis le {formatDate(emp.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Retirer"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
