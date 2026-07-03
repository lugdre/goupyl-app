import { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/analytics.api';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, CalendarCheck, TrendingUp, Activity, UserCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportEmployeesUsageCsv } from '../../utils/exportCsv';

const CATEGORY_COLORS = {
  SPORT: '#6366f1',
  NUTRITION: '#22c55e',
  MENTAL: '#a855f7',
  BIENETRE: '#f97316',
};
const CATEGORY_LABELS = { SPORT: 'Sport', NUTRITION: 'Nutrition', MENTAL: 'Mental', BIENETRE: 'Bien-être' };

function StatCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const colors = {
    violet: 'bg-violet-50 text-violet-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl shrink-0 ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name} : {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function EntrepriseAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsApi.getEntreprise()
      .then(({ data }) => setData(data))
      .catch(() => setError('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <p className="text-red-600 p-6">{error}</p>;

  const { employees, sessions, categoryStats, trend } = data;

  // Données pour le PieChart catégories
  const categoryData = Object.entries(categoryStats).map(([cat, count]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: count,
    color: CATEGORY_COLORS[cat] || '#94a3b8',
  }));

  const hasCategoryData = categoryData.length > 0;
  const hasTrendData = trend.some((t) => t.count > 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord analytique</h1>
          <p className="text-gray-500 mt-1">Suivi de l'activité bien-être de votre équipe — mois en cours</p>
        </div>
        <button
          onClick={async () => {
            try {
              await exportEmployeesUsageCsv();
              toast.success('Export CSV téléchargé');
            } catch {
              toast.error("Erreur lors de l'export");
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:border-primary-400 transition-colors"
        >
          <Download className="w-4 h-4" />Exporter CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Collaborateurs rattachés"
          value={employees.total}
          sub="dans votre entreprise"
          color="violet"
        />
        <StatCard
          icon={UserCheck}
          label="Collaborateurs actifs"
          value={employees.active}
          sub="au moins 1 séance ce mois"
          color="green"
        />
        <StatCard
          icon={CalendarCheck}
          label="Séances ce mois"
          value={sessions.total}
          sub={`${sessions.done} terminées`}
          color="blue"
        />
        <StatCard
          icon={Activity}
          label="Taux d'utilisation"
          value={employees.total > 0 ? `${Math.round((employees.active / employees.total) * 100)}%` : '—'}
          sub="collaborateurs actifs / total"
          color="orange"
        />
      </div>

      {/* Tendance 6 mois */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-violet-600" />
          <h2 className="text-base font-semibold text-gray-900">Évolution des séances sur 6 mois</h2>
        </div>
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Séances"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ fill: '#7c3aed', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Aucune séance enregistrée sur les 6 derniers mois
          </div>
        )}
      </Card>

      {/* Répartition par domaine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Répartition par domaine (ce mois)</h2>
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Aucune séance ce mois
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Séances par domaine</h2>
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={categoryData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Séances" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Aucune séance ce mois
            </div>
          )}
        </Card>
      </div>

      {/* Détail des séances */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Détail des séances du mois</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-blue-700">{sessions.total}</p>
            <p className="text-sm text-blue-600 mt-1">Séances totales</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-yellow-700">{sessions.confirmed}</p>
            <p className="text-sm text-yellow-600 mt-1">Confirmées</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-green-700">{sessions.done}</p>
            <p className="text-sm text-green-600 mt-1">Terminées</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
