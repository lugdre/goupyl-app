import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../services/auth.api';
import Spinner from '../../components/ui/Spinner';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Email vérifié !</h1>
          <p className="text-sm text-gray-500 mb-6">
            Votre compte est activé. Vous pouvez maintenant vous connecter.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-brand-800 text-white text-sm font-medium rounded-lg hover:bg-brand-900 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ce lien a déjà été utilisé ou a expiré (24h).
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
