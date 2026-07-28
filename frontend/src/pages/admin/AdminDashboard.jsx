import { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/analytics.api';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Calendar, CheckCircle, Clock, Star, TrendingUp, AlertCircle, Euro,
} from 'lucide-react';

// Palettes validées avec scripts/validate_palette.js (light, --pairs all) :
// séries catégorielles orange/violet ; statuts vert/bleu/ambre/rouge.
const SERIES = { primary: '#F4530F', secondary: '#6B4EBA' };
const NEUTRAL_MARK = '#DCDAD4';

const STATUS_COLORS = {
  CONFIRMED: '#2F7A47',
  DONE: '#2563A8',
  PENDING: '#D9A521',
  CANCELLED: '#C0392B',
};

const STATUS_BADGE_CLASS = {
  CONFIRMED: 'dsh-badge--ok',
  DONE: 'dsh-badge--neutral',
  PENDING: 'dsh-badge--wait',
  CANCELLED: 'dsh-badge--err',
};

const STATUS_FR = {
  CONFIRMED: 'Confirmé',
  DONE: 'Terminé',
  PENDING: 'En attente',
  CANCELLED: 'Annulé',
};

const AD_CSS = `
  .ad-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  @media(max-width:1100px){.ad-kpis{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.ad-kpis{grid-template-columns:1fr}}
  .ad-kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px}
  .ad-kpi.is-alert{border-color:#EBD9B4;background:#FBF7EF}
  .ad-kpi-icon{width:38px;height:38px;border-radius:12px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;margin-bottom:14px}
  .ad-kpi.is-alert .ad-kpi-icon{background:#FBF0DF;color:#A87616}
  .ad-kpi-val{font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1;color:var(--ink)}
  .ad-kpi-label{font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-top:10px}
  .ad-kpi-sub{font-size:12.5px;color:var(--ink-3);margin-top:4px}

  .ad-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .ad-row--wide{grid-template-columns:1.6fr 1fr}
  @media(max-width:1100px){.ad-row,.ad-row--wide{grid-template-columns:1fr}}
  .ad-panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 24px}
  .ad-panel-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink);margin:0 0 18px}
  .ad-panel-title svg{color:var(--ink-3)}

  .ad-tip{background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 14px;box-shadow:0 6px 18px rgba(23,22,20,.10);font-family:"Inter",system-ui,sans-serif}
  .ad-tip-label{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8a8781;margin:0 0 7px}
  .ad-tip-row{display:flex;align-items:center;gap:8px;font-size:13px;color:#4c4a46;margin:3px 0}
  .ad-tip-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
  .ad-tip-row b{color:#171614;font-weight:600}

  .ad-table{width:100%;border-collapse:collapse;font-size:13.5px}
  .ad-table th{text-align:left;padding:0 12px 12px 0;font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);border-bottom:1px solid var(--line);white-space:nowrap}
  .ad-table td{padding:13px 12px 13px 0;color:var(--ink-2);border-bottom:1px solid #F0EFEB;vertical-align:middle}
  .ad-table tr:last-child td{border-bottom:none}
  .ad-table .ad-svc{font-weight:600;color:var(--ink);max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ad-table .ad-date{color:var(--ink-3);white-space:nowrap}

  .ad-bar{display:flex;align-items:center;gap:14px}
  .ad-bar + .ad-bar{margin-top:14px}
  .ad-bar-name{min-width:104px;font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ad-bar-track{flex:1;height:8px;background:#F2F1ED;border-radius:999px;overflow:hidden}
  .ad-bar-fill{height:100%;background:var(--orange);border-radius:999px;transition:width .4s ease}
  .ad-bar-count{font-size:13px;font-weight:600;color:var(--ink);min-width:26px;text-align:right}
  .ad-none{font-size:13.5px;color:var(--ink-3);font-weight:500;text-align:center;padding:26px 0}
`;

const AXIS_TICK = { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fill: '#8a8781' };
const GRID_STROKE = '#F0EFEB';

const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—';

const LEGEND_STYLE = { fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#4c4a46' };

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ad-tip">
      <p className="ad-tip-label">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="ad-tip-row">
          <span className="ad-tip-dot" style={{ background: p.color }} />
          <b>{fmt(p.value)}{unit || ''}</b> {p.name}
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getAdmin()
      .then((res) => setData(res.data))
      .catch(() => toast.error('Erreur chargement analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  if (!data) return null;

  const { kpi, apptByStatus, months, topIntervenants, recentAppointments } = data;

  const kpiCards = [
    { label: 'Clients', value: fmt(kpi.totalClients), icon: Users, sub: 'inscrits' },
    { label: 'Coachs', value: fmt(kpi.totalIntervenants), icon: Users, sub: `${kpi.pendingVerifications} en attente` },
    { label: 'Entreprises', value: fmt(kpi.totalEntreprises), icon: TrendingUp, sub: 'abonnées' },
    { label: 'RDV total', value: fmt(kpi.totalAppointments), icon: Calendar, sub: 'toutes périodes' },
    { label: 'RDV terminés', value: fmt((apptByStatus.find(s => s.status === 'DONE')?.count) ?? 0), icon: CheckCircle, sub: 'séances effectuées' },
    { label: 'Avis', value: fmt(kpi.totalReviews), icon: Star, sub: kpi.avgRating ? `moy. ${kpi.avgRating}/5` : 'aucune note' },
    { label: 'Vérifications', value: fmt(kpi.pendingVerifications), icon: AlertCircle, sub: 'coachs à valider', alert: kpi.pendingVerifications > 0 },
    { label: 'Revenus', value: `${fmt(kpi.totalRevenue)} €`, icon: Euro, sub: 'paiements validés' },
  ];

  const maxTopCount = topIntervenants[0]?.count || 1;

  return (
    <div className="dsh-page">
      <style>{AD_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Tableau de bord</h1>
          <p className="dsh-sub">Activité en temps réel sur l'ensemble de la plateforme.</p>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="ad-kpis">
        {kpiCards.map(({ label, value, icon: Icon, sub, alert }) => (
          <div key={label} className={`ad-kpi${alert ? ' is-alert' : ''}`}>
            <div className="ad-kpi-icon"><Icon size={17} /></div>
            <div className="ad-kpi-val">{value}</div>
            <div className="ad-kpi-label">{label}</div>
            <div className="ad-kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Inscriptions + rendez-vous */}
      <div className="ad-row">
        <div className="ad-panel">
          <p className="ad-panel-title">
            <Users size={14} /> Inscriptions · 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={months} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES.primary} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={SERIES.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCoachs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES.secondary} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={SERIES.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={9} />
              <Area type="monotone" dataKey="clients" name="Clients" stroke={SERIES.primary} strokeWidth={2} fill="url(#gClients)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              <Area type="monotone" dataKey="intervenants" name="Coachs" stroke={SERIES.secondary} strokeWidth={2} fill="url(#gCoachs)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="ad-panel">
          <p className="ad-panel-title">
            <Calendar size={14} /> Rendez-vous · 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={months} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barSize={13} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(23,22,20,.04)' }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={9} />
              <Bar dataKey="appointments" name="Total" fill={NEUTRAL_MARK} radius={[4, 4, 0, 0]} />
              <Bar dataKey="done" name="Terminés" fill={SERIES.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenus + répartition des statuts */}
      <div className="ad-row">
        <div className="ad-panel">
          <p className="ad-panel-title">
            <Euro size={14} /> Revenus plateforme · 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={months} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={SERIES.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit=" €" />} />
              <Area type="monotone" dataKey="revenue" name="Revenus" stroke={SERIES.primary} strokeWidth={2} fill="url(#gRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="ad-panel">
          <p className="ad-panel-title">
            <Clock size={14} /> Répartition des statuts RDV
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={apptByStatus}
                dataKey="count"
                nameKey="status"
                cx="38%"
                cy="50%"
                innerRadius={54}
                outerRadius={80}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {apptByStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || NEUTRAL_MARK} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [fmt(v), STATUS_FR[name] || name]}
                contentStyle={{
                  fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13,
                  border: '1px solid #E4E2DC', borderRadius: 12,
                  boxShadow: '0 6px 18px rgba(23,22,20,.10)',
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={9}
                formatter={(v) => (
                  <span style={{ fontSize: 12.5, fontFamily: 'Inter, system-ui, sans-serif', color: '#4c4a46' }}>
                    {STATUS_FR[v] || v}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Derniers RDV + top coachs */}
      <div className="ad-row ad-row--wide">
        <div className="ad-panel">
          <p className="ad-panel-title">
            <Calendar size={14} /> Derniers rendez-vous
          </p>
          <table className="ad-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Client</th>
                <th>Coach</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentAppointments.length === 0 ? (
                <tr><td colSpan={5} className="ad-none">Aucun rendez-vous</td></tr>
              ) : (
                recentAppointments.map((rdv) => (
                  <tr key={rdv.id}>
                    <td className="ad-svc">
                      {rdv.coachService?.name || rdv.service?.name || '—'}
                    </td>
                    <td>{rdv.client?.firstName} {rdv.client?.lastName}</td>
                    <td>{rdv.intervenant?.firstName} {rdv.intervenant?.lastName}</td>
                    <td className="ad-date">
                      {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      <span className={`dsh-badge ${STATUS_BADGE_CLASS[rdv.status] || 'dsh-badge--neutral'}`}>
                        <i />{STATUS_FR[rdv.status] || rdv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ad-panel">
          <p className="ad-panel-title">
            <Star size={14} /> Top coachs · rendez-vous
          </p>
          {topIntervenants.length === 0 ? (
            <p className="ad-none">Aucune donnée</p>
          ) : (
            topIntervenants.map((item) => (
              <div key={item.name} className="ad-bar">
                <div className="ad-bar-name">{item.name}</div>
                <div className="ad-bar-track">
                  <div className="ad-bar-fill" style={{ width: `${Math.round((item.count / maxTopCount) * 100)}%` }} />
                </div>
                <div className="ad-bar-count">{item.count}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
