import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Calendar, Search, CreditCard, User,
  Users, Package, Building2, ShieldCheck,
  BarChart2, Star, ShoppingBag, Scale,
} from 'lucide-react';
import logo from '../../assets/logo-goupyl-sport.png';

const BASE_CLIENT_ITEMS = [
  { to: '/dashboard/client', icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
  { to: '/dashboard/client/search', icon: Search, label: 'Rechercher un coach', short: 'Trouver' },
  { to: '/dashboard/client/appointments', icon: Calendar, label: 'Mes rendez-vous', short: 'RDV' },
  { to: '/dashboard/client/marketplace', icon: ShoppingBag, label: 'Boutique', short: 'Boutique' },
  { to: '/dashboard/client/profile', icon: User, label: 'Mon profil', short: 'Profil' },
];

const menuItems = {
  INTERVENANT: [
    { to: '/dashboard/intervenant', icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
    { to: '/dashboard/intervenant/agenda', icon: Calendar, label: 'Agenda', short: 'Agenda' },
    { to: '/dashboard/intervenant/reviews', icon: Star, label: 'Avis', short: 'Avis' },
    { to: '/dashboard/intervenant/services', icon: Package, label: 'Mes services', short: 'Services' },
    { to: '/dashboard/intervenant/payments', icon: CreditCard, label: 'Paiements & gains', short: 'Gains' },
    { to: '/dashboard/intervenant/profile', icon: User, label: 'Mon profil', short: 'Profil' },
  ],
  ENTREPRISE: [
    { to: '/dashboard/entreprise', icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
    { to: '/dashboard/entreprise/employees', icon: Users, label: 'Collaborateurs', short: 'Équipe' },
    { to: '/dashboard/entreprise/search', icon: Search, label: 'Rechercher un coach', short: 'Coachs' },
    { to: '/dashboard/entreprise/analytics', icon: BarChart2, label: 'Statistiques', short: 'Stats' },
    { to: '/dashboard/entreprise/subscription', icon: CreditCard, label: 'Abonnement', short: 'Abo' },
    { to: '/dashboard/entreprise/profile', icon: Building2, label: 'Mon profil', short: 'Profil' },
  ],
  ADMIN: [
    { to: '/dashboard/admin', icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
    { to: '/dashboard/admin/users', icon: Users, label: 'Utilisateurs', short: 'Users' },
    { to: '/dashboard/admin/verifications', icon: ShieldCheck, label: 'Vérifications', short: 'Vérifs' },
    { to: '/dashboard/admin/disputes', icon: Scale, label: 'Litiges', short: 'Litiges' },
    { to: '/dashboard/admin/products', icon: Package, label: 'Produits', short: 'Produits' },
  ],
};

const END_ROUTES = new Set([
  '/dashboard/entreprise', '/dashboard/client',
  '/dashboard/admin', '/dashboard/intervenant',
]);

const ROLE_LABELS = {
  INTERVENANT: 'Professionnel',
  ENTREPRISE: 'Entreprise',
  ADMIN: 'Admin',
};

function useNavItems() {
  const { user } = useAuth();
  if (user?.role === 'CLIENT') {
    if (user.employerCompanyId) {
      const planItem = { to: '/dashboard/client/employer-plan', icon: Building2, label: 'Mon forfait', short: 'Forfait' };
      return [...BASE_CLIENT_ITEMS.slice(0, 3), planItem, ...BASE_CLIENT_ITEMS.slice(3)];
    }
    return [...BASE_CLIENT_ITEMS];
  }
  return menuItems[user?.role] || [];
}

function roleLabel(user) {
  if (!user) return '';
  if (user.role === 'CLIENT') return user.employerCompanyId ? 'Collaborateur' : 'Particulier';
  return ROLE_LABELS[user.role] || user.role;
}

export default function Sidebar() {
  const { user } = useAuth();
  const items = useNavItems();

  const displayName = user?.role === 'ENTREPRISE' && user?.companyName
    ? user.companyName
    : `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const initials = (
    (user?.firstName?.[0] || user?.companyName?.[0] || '') + (user?.lastName?.[0] || '')
  ).toUpperCase() || '?';

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="dbl-side">
        <div className="dbl-side-card">
          <Link to="/dashboard" className="dbl-brand">
            <img src={logo} alt="Goupyl Sport" />
          </Link>

          <nav className="dbl-nav">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={END_ROUTES.has(item.to)}
                className={({ isActive }) => `dbl-nav-item${isActive ? ' is-active' : ''}`}
              >
                <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="dbl-side-user">
            <div className="dbl-side-avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="dbl-side-user-name">{displayName}</div>
              <div className="dbl-side-user-role">{roleLabel(user)}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Nav mobile (bas d'écran) */}
      <nav className="dbl-mobile-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={END_ROUTES.has(item.to)}
            className={({ isActive }) => `dbl-mobile-item${isActive ? ' is-active' : ''}`}
          >
            <item.icon style={{ width: items.length > 5 ? 17 : 19, height: items.length > 5 ? 17 : 19, flexShrink: 0 }} />
            {items.length <= 5 && <span>{item.short}</span>}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
