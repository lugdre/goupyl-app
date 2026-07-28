import { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/analytics.api';
import Spinner from '../../components/ui/Spinner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, CalendarCheck, TrendingUp, Activity, UserCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportEmployeesUsageCsv } from '../../utils/exportCsv';

// Palette catégorielle validée (scripts/validate_palette.js, --pairs all) :
// la couleur suit le domaine, assignation fixe.
const CATEGORY_COLORS = {
  SPORT: '#C0392B',
  NUTRITION: '#2F7A47',
  MENTAL: '#2563A8',
  BIENETRE: '#D9A521',
};
const CATEGORY_LABELS = { SPORT: 'Sport', NUTRITION: 'Nutrition', MENTAL: 'Mental', BIENETRE: 'Bien-être' };
const SERIES_PRIMARY = '#F4530F';

const EA_CSS = `
  .ea-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  @media(max-width:1100px){.ea-kpis{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.ea-kpis{grid-template-columns:1fr}}
  .ea-kpi{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:#fff;display:flex;align-items:center;gap:14px}
  .ea-kpi-icon{width:44px;height:44px;border-radius:14px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ea-kpi-value{font-size:24px;font-weight:700;letter-spacing:-.02em;color:var(--ink);line-height:1;margin:0}
  .ea-kpi-label{font-size:12.5px;font-weight:600;color:var(--ink-2);margin:5px 0 0}
  .ea-kpi-sub{font-size:11.5px;color:var(--ink-3);margin:3px 0 0}

  .ea-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:900px){.ea-row{grid-template-columns:1fr}}
  .ea-panel-title{display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:700;letter-spacing:-.01em;color:var(--ink);margin:0 0 18px}
  .ea-panel-title svg{color:var(--ink-3)}
  .ea-none{display:flex;align-items:center;justify-content:center;height:160px;color:var(--ink-3);font-size:13.5px;font-weight:500}

  .ea-tip{background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 14px;box-shadow:0 6px 18px rgba(23,22,20,.10);font-family:"Inter",system-ui,sans-serif}
  .ea-tip-label{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8a8781;margin:0 0 7px}
  .ea-tip-row{display:flex;align-items:center;gap:8px;font-size:13px;color:#4c4a46;margin:3px 0}
  .ea-tip-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
  .ea-tip-row b{color:#171614;font-weight:600}

  .ea-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  @media(max-width:640px){.ea-tiles{grid-template-columns:1fr}}
  .ea-tile{border-radius:14px;padding:18px;text-align:center;border:1px solid}
  .ea-tile-val{font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1;margin:0}
  .ea-tile-label{font-size:12.5px;font-weight:600;margin:7px 0 0}
`;

const AXIS_TICK = { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fill: '#8a8781' };
const GRID_STROKE = '#F0EFEB';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="ea-kpi">
      <div className="ea-kpi-icon"><Icon size={19} /></div>
      <div>
        <p className="ea-kpi-value">{value}</p>
        <p className="ea-kpi-label">{label}</p>
        {sub && <p className="ea-kpi-sub">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ea-tip">
      {label && <p className="ea-tip-label">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="ea-tip-row">
          <span className="ea-tip-dot" style={{ background: p.payload?.color || p.color }} />
          <b>{p.value}</b> {p.name}
        </div>
      ))}
    </div>
  );
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  if (error) return <p style={{ color: '#C0392B', padding: 24, fontWeight: 500 }}>{error}</p>;

  const { employees, sessions, categoryStats, trend } = data;

  // Données du donut / barres par domaine
  const categoryData = Object.entries(categoryStats).map(([cat, count]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: count,
    color: CATEGORY_COLORS[cat] || '#DCDAD4',
  }));

  const hasCategoryData = categoryData.length > 0;
  const hasTrendData = trend.some((t) => t.count > 0);

  return (
    <div className="dsh-page" style={{ maxWidth: 1100 }}>
      <style>{EA_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Statistiques</h1>
          <p className="dsh-sub">Suivi de l'activité bien-être de votre équipe — mois en cours</p>
        </div>
        <button
          type="button"
          className="dsh-btn dsh-btn--ghost dsh-btn--sm"
          onClick={async () => {
            try {
              await exportEmployeesUsageCsv();
              toast.success('Export CSV téléchargé');
            } catch {
              toast.error("Erreur lors de l'export");
            }
          }}
        >
          <Download size={14} />Exporter CSV
        </button>
      </div>

      {/* Indicateurs */}
      <div className="ea-kpis">
        <StatCard
          icon={Users}
          label="Collaborateurs rattachés"
          value={employees.total}
          sub="dans votre entreprise"
        />
        <StatCard
          icon={UserCheck}
          label="Collaborateurs actifs"
          value={employees.active}
          sub="au moins 1 séance ce mois"
        />
        <StatCard
          icon={CalendarCheck}
          label="Séances ce mois"
          value={sessions.total}
          sub={`${sessions.done} terminées`}
        />
        <StatCard
          icon={Activity}
          label="Taux d'utilisation"
          value={employees.total > 0 ? `${Math.round((employees.active / employees.total) * 100)}%` : '—'}
          sub="collaborateurs actifs / total"
        />
      </div>

      {/* Tendance 6 mois */}
      <div className="dsh-card">
        <p className="ea-panel-title">
          <TrendingUp size={16} /> Évolution des séances sur 6 mois
        </p>
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 5, right: 12, left: -18, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Séances"
                stroke={SERIES_PRIMARY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="ea-none">Aucune séance enregistrée sur les 6 derniers mois</div>
        )}
      </div>

      {/* Répartition par domaine */}
      <div className="ea-row">
        <div className="dsh-card">
          <p className="ea-panel-title">Répartition par domaine (ce mois)</p>
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={9}
                  formatter={(value) => (
                    <span style={{ fontSize: 12.5, fontFamily: 'Inter, system-ui, sans-serif', color: '#4c4a46' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="ea-none">Aucune séance ce mois</div>
          )}
        </div>

        <div className="dsh-card">
          <p className="ea-panel-title">Séances par domaine</p>
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={categoryData}
                margin={{ top: 5, right: 12, left: -18, bottom: 5 }}
                barSize={30}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(23,22,20,.04)' }} />
                <Bar dataKey="value" name="Séances" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="ea-none">Aucune séance ce mois</div>
          )}
        </div>
      </div>

      {/* Détail des séances */}
      <div className="dsh-card">
        <p className="ea-panel-title">Détail des séances du mois</p>
        <div className="ea-tiles">
          <div className="ea-tile" style={{ background: '#F2F1ED', borderColor: '#E4E2DC' }}>
            <p className="ea-tile-val" style={{ color: '#171614' }}>{sessions.total}</p>
            <p className="ea-tile-label" style={{ color: '#4c4a46' }}>Séances totales</p>
          </div>
          <div className="ea-tile" style={{ background: '#FBF0DF', borderColor: '#EBD9B4' }}>
            <p className="ea-tile-val" style={{ color: '#8A6212' }}>{sessions.confirmed}</p>
            <p className="ea-tile-label" style={{ color: '#A87616' }}>Confirmées</p>
          </div>
          <div className="ea-tile" style={{ background: '#EAF3EC', borderColor: '#CDE4D3' }}>
            <p className="ea-tile-val" style={{ color: '#28643B' }}>{sessions.done}</p>
            <p className="ea-tile-label" style={{ color: '#2F7A47' }}>Terminées</p>
          </div>
        </div>
      </div>
    </div>
  );
}
