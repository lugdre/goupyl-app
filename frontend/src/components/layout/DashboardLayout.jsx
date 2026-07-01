import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Clock, XCircle } from 'lucide-react';

function VerificationBanner() {
  const { user } = useAuth();
  if (user?.role !== 'INTERVENANT') return null;

  const docPath = '/dashboard/intervenant/profile';

  if (user?.verificationStatus === 'PENDING') {
    return (
      <div style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.20)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
        <Clock style={{ width: 15, height: 15, color: '#b45309', flexShrink: 0 }} />
        <span style={{ color: '#92400e' }}>
          <strong>Compte en cours de vérification.</strong>{' '}
          Votre profil sera visible des clients une fois validé.
        </span>
        <Link to={docPath} style={{ marginLeft: 'auto', flexShrink: 0, color: '#92400e', fontWeight: 600, fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Envoyer mes documents
        </Link>
      </div>
    );
  }

  if (user?.verificationStatus === 'REJECTED') {
    return (
      <div style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.20)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
        <XCircle style={{ width: 15, height: 15, color: '#dc2626', flexShrink: 0 }} />
        <span style={{ color: '#991b1b' }}>
          <strong>Vérification refusée.</strong>{' '}
          Contactez notre équipe ou soumettez de nouveaux documents.
        </span>
        <Link to={docPath} style={{ marginLeft: 'auto', flexShrink: 0, color: '#991b1b', fontWeight: 600, fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Renvoyer des documents
        </Link>
      </div>
    );
  }

  return null;
}

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-page" data-theme="light">
      <Navbar />
      <VerificationBanner />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 max-w-full pb-20 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
