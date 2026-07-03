import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { companyApi } from '../../services/company.api';
import { PLAN_LABELS } from '../../utils/constants';
import Spinner from '../../components/ui/Spinner';
import { Building2, CalendarDays, Activity, CheckCircle, ChevronRight, Layers } from 'lucide-react';
import { cn } from '../../utils/cn';

const CATEGORY_COLORS = {
  SPORT: 'bg-blue-50 text-blue-700 border-blue-100',
  NUTRITION: 'bg-green-50 text-green-700 border-green-100',
  MENTAL: 'bg-purple-50 text-purple-700 border-purple-100',
  BIENETRE: 'bg-orange-50 text-orange-700 border-orange-100',
};
const CATEGORY_LABELS_MAP = { SPORT: 'Sport', NUTRITION: 'Nutrition', MENTAL: 'Mental', BIENETRE: 'Bien-être' };

export default function MyEmployerPlan() {
  const [planData, setPlanData] = useState(null);
  const [stats, setStats] = useState(null);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      companyApi.getEmployerPlan().then(({ data }) => setPlanData(data)),
      companyApi.getEmployeeStats().then(({ data }) => setStats(data)),
      companyApi.getMyQuota().then(({ data }) => setQuota(data)).catch(() => {}),
    ])
      .catch(() => setError('Impossible de charger les informations du forfait.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <p className="text-red-600 p-6">{error}</p>;

  const { company, subscription } = planData;

  const grouped = {};
  if (stats?.services) {
    stats.services.forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon forfait entreprise</h1>
        <p className="text-gray-500 mt-1">Couverture offerte par votre employeur</p>
      </div>

      {/* Company + plan card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-primary-50 rounded-xl shrink-0">
            <Building2 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{company.name}</p>
            {subscription && (
              <p className="text-sm text-gray-500">Formule {PLAN_LABELS[subscription.plan]}</p>
            )}
          </div>
        </div>

        {subscription ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
              <CalendarDays className="w-4 h-4" />
              <span>Valide jusqu'au {new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            {/* Quota mensuel de séances couvertes */}
            {quota?.quota != null && (
              <div className="bg-gray-50 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Séances couvertes ce mois ({quota.month})</p>
                  <p className="text-sm font-bold text-gray-900">{quota.used} / {quota.quota}</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', quota.remaining === 0 ? 'bg-amber-500' : 'bg-primary-500')}
                    style={{ width: `${Math.min((quota.used / quota.quota) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {quota.remaining > 0
                    ? `${quota.remaining} séance(s) restante(s) prise(s) en charge par votre entreprise.`
                    : 'Quota atteint — les prochaines séances de ce mois seront à votre charge.'}
                </p>
              </div>
            )}

            {/* Personal usage stats */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{stats.sessions.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Séances ce mois</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.sessions.confirmed}</p>
                  <p className="text-xs text-gray-500 mt-1">Confirmées / réalisées</p>
                </div>
              </div>
            )}

            <Link
              to="/dashboard/client/services"
              className="flex items-center justify-between p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-semibold text-primary-700">Accéder au catalogue de services</span>
              </div>
              <ChevronRight className="w-4 h-4 text-primary-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Votre entreprise n'a pas de forfait actif pour le moment.</p>
            <p className="text-gray-400 text-xs mt-1">Contactez votre responsable RH pour plus d'informations.</p>
          </div>
        )}
      </div>

      {/* Services available */}
      {stats?.services?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Services inclus dans votre forfait</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, services]) => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{CATEGORY_LABELS_MAP[cat] || cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {services.map((s) => (
                    <div key={s.id} className={cn('rounded-xl border p-3 flex items-center gap-3', CATEGORY_COLORS[s.category] || 'bg-gray-50 text-gray-700 border-gray-100')}>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs opacity-70">{s.durationMinutes} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
