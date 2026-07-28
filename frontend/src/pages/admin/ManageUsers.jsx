import { useState, useEffect } from 'react';
import { userApi } from '../../services/user.api';
import Spinner from '../../components/ui/Spinner';
import { Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_FILTERS = ['', 'CLIENT', 'INTERVENANT', 'ENTREPRISE', 'ADMIN'];
const ROLE_LABEL = { CLIENT: 'Client', INTERVENANT: 'Coach', ENTREPRISE: 'Entreprise', ADMIN: 'Admin' };
const ROLE_BADGE_CLASS = {
  CLIENT: 'dsh-badge--neutral',
  INTERVENANT: 'dsh-badge--orange',
  ENTREPRISE: 'dsh-badge--ok',
  ADMIN: 'dsh-badge--err',
};

const MU_CSS = `
  .mu-user{display:flex;align-items:center;gap:12px;min-width:0}
  .mu-name{font-size:14px;font-weight:600;color:var(--ink)}
  .mu-email{font-size:12px;color:var(--ink-3);margin-top:1px}
  .mu-status{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;white-space:nowrap}
  .mu-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
`;

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
    <div className="dsh-page">
      <style>{MU_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Gestion des utilisateurs</h1>
          <p className="dsh-sub">{users.length} utilisateur{users.length !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <div className="dsh-toolbar">
        <div className="dsh-search">
          <Search size={15} style={{ color: '#8a8781', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Nom, prénom, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un utilisateur"
          />
        </div>
        <div className="dsh-chips">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`dsh-chip${roleFilter === r ? ' is-active' : ''}`}
            >
              {r ? ROLE_LABEL[r] : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="dsh-empty">
          <Users size={26} />
          Aucun utilisateur trouvé
        </div>
      ) : (
        <div className="dsh-table-wrap">
          <div className="dsh-table-scroll">
            <table className="dsh-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th className="num">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="mu-user">
                        <div className="dsh-ini">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="mu-name">{user.firstName} {user.lastName}</div>
                          <div className="mu-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`dsh-badge ${ROLE_BADGE_CLASS[user.role] || 'dsh-badge--neutral'}`}>
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <span className="mu-status" style={{ color: user.isActive ? '#2F7A47' : '#C0392B' }}>
                        <span className="mu-dot" style={{ background: user.isActive ? '#2F7A47' : '#C0392B' }} />
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="dsh-table-muted">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="num">
                      {user.role !== 'ADMIN' && (
                        <button
                          type="button"
                          className={`dsh-btn dsh-btn--sm ${user.isActive ? 'dsh-btn--danger' : 'dsh-btn--ghost'}`}
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
        </div>
      )}
    </div>
  );
}
