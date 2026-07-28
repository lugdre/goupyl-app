import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [slow, setSlow] = useState(false);

  // Le backend dort quand l'app n'a pas ete utilisee depuis un moment : la
  // reprise de session peut prendre une bonne minute. On l'annonce plutot que
  // de laisser tourner un spinner muet.
  useEffect(() => {
    if (!loading) return undefined;
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        {slow && (
          <p className="text-sm text-gray-500 text-center px-6">
            Reconnexion en cours, le serveur se reveille…
          </p>
        )}
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children ? children : <Outlet />;
}
