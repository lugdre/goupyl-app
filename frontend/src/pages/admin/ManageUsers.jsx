import { useState, useEffect } from 'react';
import { userApi } from '../../services/user.api';
import Spinner from '../../components/ui/Spinner';
import { Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const CSS = `
  .mu{font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;color:#0a0a0a}
  .mu-eyebrow{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:4px}
  .mu-title{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:clamp(24px,3vw,32px);text-transform:uppercase;letter-spacing:-.01em;margin:0 0 2px}
  .mu-sub{font-size:13px;color:#555;margin:0 0 24px}
  .mu-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px}
  .mu-search{position:relative;flex:1;min-width:200px}
  .mu-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#888;pointer-events:none}
  .mu-search-input{width:100%;height:40px;padding:0 12px 0 36px;border:1px solid rgba(0,0,0,.10);background:#fff;font-family:"Inter Tight",sans-serif;font-size:13px;color:#0a0a0a;outline:none;transition:border-color .15s;box-sizing:border-box}
  .mu-search-input::placeholder{color:#aaa}
  .mu-search-input:focus{border-color:#0a0a0a}
  .mu-filters{display:flex;gap:6px;flex-wrap:wrap}
  .mu-filter-btn{height:32px;padding:0 14px;border:1px solid rgba(0,0,0,.10);background:#fff;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#555;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
  .mu-filter-btn:hover{border-color:#0a0a0a;color:#0a0a0a}
  .mu-filter-btn.active{background:#0a0a0a;color:#f4f4f2;border-color:#0a0a0a}
  .mu-panel{background:#fff;border:1px solid rgba(0,0,0,.10)}
  .mu-table{width:100%;border-collapse:collapse}
  .mu-table th{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#888;text-align:left;padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.08);font-weight:400;white-space:nowrap}
  .mu-table td{font-size:13px;padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.06);vertical-align:middle}
  .mu-table tr:last-child td{border-bottom:none}
  .mu-table tr:hover td{background:#fafaf8}
  .mu-avatar{width:32px;height:32px;background:#f4f4f2;border:1px solid rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:12px;color:#0a0a0a;flex-shrink:0;text-transform:uppercase}
  .mu-name{font-weight:500;color:#0a0a0a}
  .mu-email{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:#888;margin-top:1px}
  .mu-role-badge{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border:1px solid;font-weight:500}
  .mu-role-CLIENT{background:#f4f4f2;border-color:rgba(0,0,0,.15);color:#555}
  .mu-role-INTERVENANT{background:#e8eaf4;border-color:#5a6aae;color:#2a3a8e}
  .mu-role-ENTREPRISE{background:#e8f4e8;border-color:#5a9e5a;color:#2a6e2a}
  .mu-role-ADMIN{background:#0a0a0a;border-color:#0a0a0a;color:#f4f4f2}
  .mu-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .mu-dot.active{background:#5a9e5a}
  .mu-dot.inactive{background:#ae5a5a}
  .mu-action-btn{height:28px;padding:0 12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:background .15s,color .15s,border-color .15s;white-space:nowrap}
  .mu-action-btn.deactivate{color:#ae5a5a;border-color:rgba(174,90,90,.3)}
  .mu-action-btn.deactivate:hover{background:#ae5a5a;color:#fff;border-color:#ae5a5a}
  .mu-action-btn.activate{color:#5a9e5a;border-color:rgba(90,158,90,.3)}
  .mu-action-btn.activate:hover{background:#5a9e5a;color:#fff;border-color:#5a9e5a}
  .mu-action-btn:disabled{opacity:.45;cursor:not-allowed}
  .mu-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;gap:12px;color:#888}
  .mu-empty-label{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase}
`;

const ROLE_FILTERS = ['', 'CLIENT', 'INTERVENANT', 'ENTREPRISE', 'ADMIN'];
const ROLE_LABEL = { CLIENT: 'Client', INTERVENANT: 'Coach', ENTREPRISE: 'Entreprise', ADMIN: 'Admin' };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  const fetchData = () => {
    setLoading(true);
    userApi
      .getAllUsers({ page: 1, limit: 200, ...(roleFilter && { role: roleFilter }) })
      .then(({ data }) => setUsers(data.users))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [roleFilter]);

  const handleToggle = async (user) => {
    setToggling(user.id);
    try {
      if (user.isActive) {
        await userApi.deactivateUser(user.id);
      } else {
        await userApi.activateUser(user.id);
      }
      toast.success('Statut mis à jour');
      fetchData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setToggling(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mu">
      <style>{CSS}</style>

      <div className="mu-eyebrow">Admin · Utilisateurs</div>
      <h1 className="mu-title">Gestion des utilisateurs</h1>
      <p className="mu-sub">{users.length} utilisateur{users.length !== 1 ? 's' : ''} au total</p>

      <div className="mu-toolbar">
        <div className="mu-search">
          <Search size={14} className="mu-search-icon" />
          <input
            type="text"
            placeholder="Nom, prénom, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mu-search-input"
          />
        </div>
        <div className="mu-filters">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`mu-filter-btn${roleFilter === r ? ' active' : ''}`}
            >
              {r ? ROLE_LABEL[r] : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="mu-panel">
          <div className="mu-empty">
            <Users size={32} strokeWidth={1} />
            <span className="mu-empty-label">Aucun utilisateur trouvé</span>
          </div>
        </div>
      ) : (
        <div className="mu-panel">
          <table className="mu-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="mu-avatar">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <div className="mu-name">{user.firstName} {user.lastName}</div>
                        <div className="mu-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`mu-role-badge mu-role-${user.role}`}>
                      {ROLE_LABEL[user.role] || user.role}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`mu-dot ${user.isActive ? 'active' : 'inactive'}`} />
                      <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: user.isActive ? '#5a9e5a' : '#ae5a5a' }}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10.5, color: '#888' }}>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {user.role !== 'ADMIN' && (
                      <button
                        className={`mu-action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                        disabled={toggling === user.id}
                        onClick={() => handleToggle(user)}
                      >
                        {toggling === user.id ? '…' : user.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
