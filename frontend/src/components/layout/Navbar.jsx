import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Badge from '../ui/Badge';
import NotificationBell from '../NotificationBell';
import logo from '../../assets/logo-goupyl-sport-white.png';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';

const ROLE_LABELS = { CLIENT: 'Client', INTERVENANT: 'Pro', ADMIN: 'Admin', ENTREPRISE: 'Entreprise' };

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ backgroundColor: 'var(--bg-navbar)', borderBottom: '1px solid var(--border-navbar)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src={logo} alt="Goupyl Sport" className="h-25 w-auto" />
          </Link>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <img
                  src={user.avatarUrl || (user.gender === 'FEMME' ? avatarFemale : avatarMale)}
                  alt="avatar"
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <span className="text-sm text-gray-500 font-medium">
                  {user.role === 'ENTREPRISE' && user.companyName
                    ? user.companyName
                    : `${user.firstName} ${user.lastName}`}
                </span>
                <Badge variant={user.role}>{ROLE_LABELS[user.role] || user.role}</Badge>
                {user.role === 'INTERVENANT' && <NotificationBell />}
                <button
                  onClick={handleLogout}
                  className="ml-1 p-2 text-gray-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.05]"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 transition-colors rounded-xl"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-400 hover:bg-white/[0.05] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 py-4 space-y-3 backdrop-blur-xl" style={{ borderTop: '1px solid var(--border-navbar)', backgroundColor: 'var(--bg-navbar)' }}>
          {isAuthenticated ? (
            <>
              <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
              <Badge variant={user.role}>{ROLE_LABELS[user.role]}</Badge>
              <button onClick={handleLogout} className="block text-sm text-red-400 font-medium mt-2">
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-[15px] font-medium text-gray-400" onClick={() => setMobileOpen(false)}>
                Connexion
              </Link>
              <Link to="/register" className="block text-[15px] font-semibold text-primary-400" onClick={() => setMobileOpen(false)}>
                S'inscrire
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
