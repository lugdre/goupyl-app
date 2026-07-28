import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Search } from 'lucide-react';
import NotificationBell from '../NotificationBell';

const SEARCH_PATHS = {
  CLIENT: '/dashboard/client/search',
  ENTREPRISE: '/dashboard/entreprise/search',
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  const searchPath = SEARCH_PATHS[user?.role];
  const displayName = user?.role === 'ENTREPRISE' && user?.companyName
    ? user.companyName
    : user?.firstName;

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchPath) return;
    navigate(query.trim() ? `${searchPath}?q=${encodeURIComponent(query.trim())}` : searchPath);
  };

  return (
    <header className="dbl-head">
      <div>
        <div className="dbl-head-date">{today}</div>
        <div className="dbl-head-title">Bonjour {displayName}</div>
      </div>

      <div className="dbl-head-right">
        {searchPath && (
          <form className="dbl-head-search" onSubmit={handleSearch}>
            <Search size={15} style={{ color: '#8a8781', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Trouver un professionnel…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Trouver un professionnel"
            />
          </form>
        )}
        <NotificationBell />
        <button
          type="button"
          onClick={handleLogout}
          title="Se déconnecter"
          className="dbl-head-icon"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
