import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import logo from '../../assets/logo-goupyl-sport.png';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';

const ROLE_LABELS = { CLIENT: 'Client', INTERVENANT: 'Pro', ADMIN: 'Admin', ENTREPRISE: 'Entreprise' };

const ROLE_COLORS = {
  CLIENT: { bg: 'rgba(37,45,98,0.08)', color: '#252d62' },
  INTERVENANT: { bg: 'rgba(74,124,89,0.12)', color: '#4A7C59' },
  ADMIN: { bg: 'rgba(220,38,38,0.10)', color: '#dc2626' },
  ENTREPRISE: { bg: 'rgba(196,149,106,0.15)', color: '#92400e' },
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleStyle = ROLE_COLORS[user?.role] || { bg: 'rgba(0,0,0,0.06)', color: '#555' };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-navbar)',
      backdropFilter: 'saturate(150%) blur(14px)',
      borderBottom: '1px solid var(--border-navbar)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <img src={logo} alt="Goupyl Sport" style={{ height: 100, width: 'auto' }} />
          </Link>

          {/* Right section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAuthenticated ? (
              <>
                <img
                  src={user.avatarUrl || (user.gender === 'FEMME' ? avatarFemale : avatarMale)}
                  alt="avatar"
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.10)' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-gray-700, #2a2a2a)', letterSpacing: '.01em' }}>
                  {user.role === 'ENTREPRISE' && user.companyName
                    ? user.companyName
                    : `${user.firstName} ${user.lastName}`}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '2px 8px', borderRadius: 999,
                  fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase',
                  background: roleStyle.bg, color: roleStyle.color,
                }}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
                {user.role === 'INTERVENANT' && <NotificationBell />}
                <button
                  onClick={handleLogout}
                  title="Se déconnecter"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 6, border: 'none',
                    background: 'transparent', cursor: 'pointer', color: '#888',
                    transition: 'color .15s, background .15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ fontSize: 13, fontWeight: 500, color: '#555', textDecoration: 'none', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', transition: 'border-color .15s' }}>
                  Connexion
                </Link>
                <Link to="/register" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#252d62', textDecoration: 'none', padding: '6px 16px', borderRadius: 999, transition: 'background .15s' }}>
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
