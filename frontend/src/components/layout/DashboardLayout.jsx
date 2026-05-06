import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Clock, XCircle } from 'lucide-react';

function VerificationBanner() {
  const { user } = useAuth();
  if (user?.role !== 'INTERVENANT') return null;

  const docPath = '/dashboard/intervenant/documents';

  if (user?.verificationStatus === 'PENDING') {
    return (
      <div className="bg-amber-500/10 backdrop-blur-sm border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-3 text-sm">
        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-amber-300">
          <span className="font-semibold">Compte en cours de vérification.</span>{' '}
          Votre profil sera visible des clients une fois validé.
        </span>
        <Link to={docPath} className="ml-auto shrink-0 text-amber-300 hover:text-amber-200 font-semibold text-[13px] underline underline-offset-2">
          Envoyer mes documents
        </Link>
      </div>
    );
  }

  if (user?.verificationStatus === 'REJECTED') {
    return (
      <div className="bg-red-500/10 backdrop-blur-sm border-b border-red-500/20 px-6 py-2.5 flex items-center gap-3 text-sm">
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-red-300">
          <span className="font-semibold">Vérification refusée.</span>{' '}
          Contactez notre équipe ou soumettez de nouveaux documents.
        </span>
        <Link to={docPath} className="ml-auto shrink-0 text-red-300 hover:text-red-200 font-semibold text-[13px] underline underline-offset-2">
          Renvoyer des documents
        </Link>
      </div>
    );
  }

  return null;
}

export default function DashboardLayout() {
  return (
    <div className="layout-dark min-h-screen bg-page">
      <Navbar />
      <VerificationBanner />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
