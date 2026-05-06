import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Calendar, Search, CreditCard, User,
  Users, Package, Building2, ShieldCheck, FileText,
  BarChart2, BookOpen, Euro, Star,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const BASE_CLIENT_ITEMS = [
  { to: '/dashboard/client', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/dashboard/client/search', icon: Search, label: 'Trouver un pro' },
  { to: '/dashboard/client/appointments', icon: Calendar, label: 'Mes rendez-vous' },
  { to: '/dashboard/client/profile', icon: User, label: 'Mon profil' },
];

const menuItems = {
  INTERVENANT: [
    { to: '/dashboard/intervenant', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/dashboard/intervenant/agenda', icon: Calendar, label: 'Mon agenda' },
    { to: '/dashboard/intervenant/reviews', icon: Star, label: 'Mes avis' },
    { to: '/dashboard/intervenant/payments', icon: CreditCard, label: 'Paiements' },
    { to: '/dashboard/intervenant/earnings', icon: Euro, label: 'Mes gains' },
    { to: '/dashboard/intervenant/profile', icon: User, label: 'Mon profil' },
    { to: '/dashboard/intervenant/documents', icon: FileText, label: 'Mes documents' },
  ],
  ENTREPRISE: [
    { to: '/dashboard/entreprise', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/dashboard/entreprise/employees', icon: Users, label: 'Mes salariés' },
    { to: '/dashboard/entreprise/search', icon: Search, label: 'Nos coachs' },
    { to: '/dashboard/entreprise/analytics', icon: BarChart2, label: 'Statistiques' },
    { to: '/dashboard/entreprise/resources', icon: BookOpen, label: 'Ressources' },
    { to: '/dashboard/entreprise/subscription', icon: CreditCard, label: 'Mon abonnement' },
    { to: '/dashboard/entreprise/profile', icon: Building2, label: 'Profil entreprise' },
  ],
  ADMIN: [
    { to: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/dashboard/admin/verifications', icon: ShieldCheck, label: 'Vérifications' },
    { to: '/dashboard/admin/services', icon: Package, label: 'Services' },
  ],
};

const END_ROUTES = new Set([
  '/dashboard/entreprise', '/dashboard/client',
  '/dashboard/admin', '/dashboard/intervenant',
]);

export default function Sidebar() {
  const { user } = useAuth();

  let items;
  if (user?.role === 'CLIENT') {
    if (user.employerCompanyId) {
      const planItem = { to: '/dashboard/client/employer-plan', icon: Building2, label: 'Mon forfait entreprise' };
      const resourcesItem = { to: '/dashboard/client/resources', icon: BookOpen, label: 'Ressources' };
      const servicesItem = { to: '/dashboard/client/services', icon: Package, label: 'Nos services' };
      items = [...BASE_CLIENT_ITEMS.slice(0, 3), planItem, servicesItem, resourcesItem, BASE_CLIENT_ITEMS[3]];
    } else {
      items = [...BASE_CLIENT_ITEMS];
    }
  } else {
    items = menuItems[user?.role] || [];
  }

  return (
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
  );
}
