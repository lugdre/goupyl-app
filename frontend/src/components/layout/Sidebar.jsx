import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Calendar, Search, CreditCard, User,
  Users, Package, Building2, ShieldCheck, FileText,
  BarChart2, BookOpen, Euro, Star,
} from 'lucide-react';
import { cn } from '../../utils/cn';

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
    { to: '/dashboard/intervenant/payments', icon: CreditCard, label: 'Paiements' },
    { to: '/dashboard/intervenant/earnings', icon: Euro, label: 'Gains' },
    { to: '/dashboard/intervenant/profile', icon: User, label: 'Profil' },
    { to: '/dashboard/intervenant/documents', icon: FileText, label: 'Documents' },
  ],
  ENTREPRISE: [
    { to: '/dashboard/entreprise', icon: LayoutDashboard, label: 'Accueil' },
    { to: '/dashboard/entreprise/employees', icon: Users, label: 'Salariés' },
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
    { to: '/dashboard/admin/services', icon: Package, label: 'Services' },
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
      {/* Sidebar desktop */}
      <aside className="w-56 min-h-screen hidden lg:block shrink-0 bg-sidebar" style={{ borderRight: '1px solid var(--border-sidebar)' }}>
        <nav className="p-2.5 space-y-0.5 sticky top-14">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={END_ROUTES.has(item.to)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-600/80 text-white'
                    : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'
                )
              }
            >
              <item.icon className="w-[17px] h-[17px] shrink-0 opacity-80" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Bottom nav mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-sidebar"
        style={{ borderTop: '1px solid var(--border-sidebar)', height: 60 }}
      >
        {(items.length <= 5 ? items : [...items.slice(0, 3), ...items.slice(-2)]).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={END_ROUTES.has(item.to)}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary-400'
                  : 'text-gray-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'opacity-100' : 'opacity-60')} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
