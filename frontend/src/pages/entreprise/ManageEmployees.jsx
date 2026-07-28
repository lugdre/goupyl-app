import { useState, useEffect, useCallback } from 'react';
import { companyApi } from '../../services/company.api';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Users, Copy, RefreshCw, Mail, Trash2, UserMinus, Check, Download } from 'lucide-react';
import { exportEmployeesUsageCsv } from '../../utils/exportCsv';

const ME_CSS = `
  .me-code-row{display:flex;align-items:stretch;gap:10px;flex-wrap:wrap}
  .me-code{flex:1;min-width:200px;background:#FAF9F7;border:1px solid var(--line);border-radius:14px;padding:14px 18px;font-size:22px;font-weight:700;letter-spacing:.24em;text-align:center;color:var(--orange);text-transform:uppercase}
  .me-code-btn{display:inline-flex;align-items:center;gap:8px;padding:0 18px;border-radius:14px;border:1px solid var(--line);background:#fff;font-family:inherit;font-size:13px;font-weight:500;color:var(--ink-2);cursor:pointer;transition:border-color .15s,color .15s}
  .me-code-btn:hover{border-color:#c9c7c1;color:var(--ink)}
  .me-code-btn.is-danger:hover{border-color:#EFC7BE;color:#C0392B;background:#FBEAE7}

  .me-invite-form{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
  .me-invite-form .dsh-input{flex:1;min-width:220px}

  .me-invite{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#FBF3E2;border:1px solid #EBD9B4;border-radius:12px;padding:12px 16px}
  .me-invite + .me-invite{margin-top:8px}
  .me-invite-mail{font-size:13.5px;font-weight:600;color:var(--ink);margin:0}
  .me-invite-meta{font-size:12px;color:#8A6212;margin:3px 0 0}
  .me-invite-meta code{font-family:ui-monospace,monospace;font-weight:600}

  .me-emp{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px 16px;background:#fff;transition:border-color .2s}
  .me-emp:hover{border-color:#c9c7c1}
  .me-emp + .me-emp{margin-top:8px}
  .me-emp-left{display:flex;align-items:center;gap:12px;min-width:0}
  .me-emp-name{font-size:13.5px;font-weight:600;color:var(--ink);margin:0}
  .me-emp-meta{font-size:12px;color:var(--ink-3);margin:2px 0 0}

  .me-icon-btn{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:border-color .15s,color .15s,background .15s}
  .me-icon-btn:hover{border-color:#EFC7BE;color:#C0392B;background:#FBEAE7}
  .me-label{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px}
`;

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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size="lg" /></div>;

  const handleExportCsv = async () => {
    try {
      await exportEmployeesUsageCsv();
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  return (
    <div className="dsh-page" style={{ maxWidth: 860 }}>
      <style>{ME_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mes collaborateurs</h1>
          <p className="dsh-sub">
            {employees.length} collaborateur{employees.length !== 1 ? 's' : ''} rattaché{employees.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={handleExportCsv}>
          <Download size={14} />Exporter CSV
        </button>
      </div>

      {/* Code d'accès */}
      <div className="dsh-card">
        <h2 className="dsh-card-title">Code d'accès entreprise</h2>
        <p className="dsh-card-sub" style={{ marginBottom: 16, lineHeight: 1.55, maxWidth: 560 }}>
          Partagez ce code avec vos collaborateurs pour qu'ils puissent rejoindre votre espace lors de leur inscription.
        </p>
        <div className="me-code-row">
          <div className="me-code">{joinCode}</div>
          <button type="button" onClick={handleCopy} className="me-code-btn" title="Copier">
            {copied ? <Check size={15} style={{ color: '#2F7A47' }} /> : <Copy size={15} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button type="button" onClick={handleRegenerate} className="me-code-btn is-danger" title="Régénérer">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Invitations par email */}
      <div className="dsh-card">
        <h2 className="dsh-card-title" style={{ marginBottom: 16 }}>Invitations par email</h2>
        <form onSubmit={handleSendInvite} className="me-invite-form">
          <input
            type="email"
            className="dsh-input"
            placeholder="prenom.nom@entreprise.fr"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            aria-label="Email du collaborateur à inviter"
          />
          <button type="submit" className="dsh-btn dsh-btn--orange" disabled={sendingInvite}>
            <Mail size={15} />
            {sendingInvite ? 'Envoi…' : 'Inviter'}
          </button>
        </form>

        {invites.length === 0 ? (
          <p className="dsh-card-sub" style={{ fontStyle: 'italic', margin: 0 }}>Aucune invitation en attente</p>
        ) : (
          <div>
            <p className="me-label">En attente</p>
            {invites.map((inv) => (
              <div key={inv.id} className="me-invite">
                <div style={{ minWidth: 0 }}>
                  <p className="me-invite-mail">{inv.email}</p>
                  <p className="me-invite-meta">
                    Token : <code>{inv.token}</code> · Expire le {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteInvite(inv.id)}
                  className="me-icon-btn"
                  title="Supprimer l'invitation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liste des collaborateurs */}
      <div className="dsh-card">
        <h2 className="dsh-card-title" style={{ marginBottom: 16 }}>Collaborateurs actifs</h2>
        {employees.length === 0 ? (
          <div className="dsh-empty" style={{ border: 'none', padding: '28px 20px' }}>
            <Users size={26} />
            <span>Aucun collaborateur rattaché</span>
            <span style={{ fontWeight: 400 }}>Partagez le code ci-dessus ou envoyez des invitations</span>
          </div>
        ) : (
          <div>
            {employees.map((emp) => (
              <div key={emp.id} className="me-emp">
                <div className="me-emp-left">
                  <div className="dsh-ini">{emp.firstName[0]}{emp.lastName[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <p className="me-emp-name">{emp.firstName} {emp.lastName}</p>
                    <p className="me-emp-meta">{emp.email} · Depuis le {formatDate(emp.createdAt)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                  className="me-icon-btn"
                  title="Retirer"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
