import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Calendar, Search, CreditCard, User,
  Users, Package, Building2, ShieldCheck, FileText,
  BarChart2, BookOpen, Star,
} from 'lucide-react';

const BASE_CLIENT_ITEMS = [
  { to: '/dashboard/client', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/dashboard/client/search', icon: Search, label: 'Trouver' },
  { to: '/dashboard/client/appointments', icon: Calendar, label: 'Rendez-vous' },
  { to: '/dashboard/client/profile', icon: User, label: 'Profil' },
];

const menuItems = {
  INTERVENANT: [
    { to: '/dashboard/intervenant', icon: LayoutDashboard, label: 'Accueil' },
    { to: '/dashboard/intervenant/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/dashboard/intervenant/reviews', icon: Star, label: 'Avis' },
    { to: '/dashboard/intervenant/payments', icon: CreditCard, label: 'Paiements & gains' },
    { to: '/dashboard/intervenant/profile', icon: User, label: 'Profil' },
    { to: '/dashboard/intervenant/documents', icon: FileText, label: 'Documents' },
  ],
  ENTREPRISE: [
    { to: '/dashboard/entreprise', icon: LayoutDashboard, label: 'Accueil' },
    { to: '/dashboard/entreprise/employees', icon: Users, label: 'Collaborateurs' },
    { to: '/dashboard/entreprise/search', icon: Search, label: 'Coachs' },
    { to: '/dashboard/entreprise/analytics', icon: BarChart2, label: 'Stats' },
    { to: '/dashboard/entreprise/resources', icon: BookOpen, label: 'Ressources' },
    { to: '/dashboard/entreprise/subscription', icon: CreditCard, label: 'Abonnement' },
    { to: '/dashboard/entreprise/profile', icon: Building2, label: 'Profil' },
  ],
  ADMIN: [
    { to: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/dashboard/admin/verifications', icon: ShieldCheck, label: 'Vérifs' },
  ],
};

const END_ROUTES = new Set([
  '/dashboard/entreprise', '/dashboard/client',
  '/dashboard/admin', '/dashboard/intervenant',
]);

function useNavItems() {
  const { user } = useAuth();
  if (user?.role === 'CLIENT') {
    if (user.employerCompanyId) {
      const planItem = { to: '/dashboard/client/employer-plan', icon: Building2, label: 'Forfait' };
      const resourcesItem = { to: '/dashboard/client/resources', icon: BookOpen, label: 'Ressources' };
      const servicesItem = { to: '/dashboard/client/services', icon: Package, label: 'Services' };
      return [...BASE_CLIENT_ITEMS.slice(0, 3), planItem, servicesItem, resourcesItem, BASE_CLIENT_ITEMS[3]];
    }
    return [...BASE_CLIENT_ITEMS];
  }
  return menuItems[user?.role] || [];
}

export default function Sidebar() {
  const items = useNavItems();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block shrink-0"
        style={{
          width: 216, minHeight: '100vh',
          background: 'var(--color-sidebar)',
          borderRight: '1px solid var(--border-sidebar)',
        }}
      >
        <nav style={{ padding: '12px 10px', position: 'sticky', top: 56 }}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={END_ROUTES.has(item.to)}
            >
              {({ isActive }) => (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', marginBottom: 2,
                    borderRadius: 4,
                    fontSize: 13, fontWeight: 500, letterSpacing: '.01em',
                    background: isActive ? '#252d62' : 'transparent',
                    color: isActive ? '#ffffff' : '#555555',
                    cursor: 'pointer',
                    transition: 'background .15s, color .15s',
                  }}
                  onMouseOver={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.color = '#0a0a0a';
                    }
                  }}
                  onMouseOut={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#555555';
                    }
                  }}
                >
                  <item.icon style={{ width: 15, height: 15, flexShrink: 0, opacity: 0.85 }} />
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: 'var(--color-sidebar)',
          borderTop: '1px solid var(--border-sidebar)',
          height: 60,
        }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={END_ROUTES.has(item.to)}
            style={({ isActive }) => ({
              display: 'flex', flex: 1, flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, textDecoration: 'none', fontWeight: 500,
              color: isActive ? '#252d62' : '#888',
              transition: 'color .15s',
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon style={{
                  width: items.length > 5 ? 17 : 20,
                  height: items.length > 5 ? 17 : 20,
                  flexShrink: 0, opacity: isActive ? 1 : 0.6,
                }} />
                {items.length <= 5 && (
                  <span style={{ fontSize: 10, letterSpacing: '.02em' }}>{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
