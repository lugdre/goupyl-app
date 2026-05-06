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

const CSS = `
  .adash{font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;color:#0a0a0a}
  .adash-eyebrow{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:4px}
  .adash-title{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:clamp(24px,3vw,32px);text-transform:uppercase;letter-spacing:-.01em;margin:0 0 2px}
  .adash-sub{font-size:13px;color:#555;margin:0}
  .adash-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}
  @media(max-width:900px){.adash-kpi-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:480px){.adash-kpi-grid{grid-template-columns:1fr}}
  .adash-kpi{background:#fff;border:1px solid rgba(0,0,0,.10);padding:20px;display:flex;flex-direction:column;gap:6px}
  .adash-kpi-val{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:32px;letter-spacing:-.02em;line-height:1}
  .adash-kpi-label{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#888}
  .adash-kpi-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:#f4f4f2;border:1px solid rgba(0,0,0,.08);margin-bottom:4px}
  .adash-charts-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
  @media(max-width:900px){.adash-charts-row{grid-template-columns:1fr}}
  .adash-charts-row-3{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}
  @media(max-width:900px){.adash-charts-row-3{grid-template-columns:1fr}}
  .adash-panel{background:#fff;border:1px solid rgba(0,0,0,.10);padding:24px}
  .adash-panel-title{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#555;margin:0 0 20px;display:flex;align-items:center;gap:8px}
  .adash-table{width:100%;border-collapse:collapse}
  .adash-table th{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#888;text-align:left;padding:0 0 10px;border-bottom:1px solid rgba(0,0,0,.08);font-weight:400}
  .adash-table td{font-size:13px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06);vertical-align:middle}
  .adash-table tr:last-child td{border-bottom:none}
  .adash-badge{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.08em;padding:3px 8px;border:1px solid;font-weight:500}
  .adash-badge.CONFIRMED{background:#e8f4e8;border-color:#5a9e5a;color:#2a6e2a}
  .adash-badge.DONE{background:#e8eaf4;border-color:#5a6aae;color:#2a3a8e}
  .adash-badge.PENDING{background:#f4f0e0;border-color:#ae9a4a;color:#6e5a0a}
  .adash-badge.CANCELLED{background:#f4e8e8;border-color:#ae5a5a;color:#6e1a1a}
  .adash-bar-item{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  .adash-bar-item:last-child{margin-bottom:0}
  .adash-bar-track{flex:1;height:6px;background:#f4f4f2;border:1px solid rgba(0,0,0,.06)}
  .adash-bar-fill{height:100%;background:#0a0a0a;transition:width .4s ease}
`;

const STATUS_COLORS = {
  CONFIRMED: '#5a9e5a',
  DONE: '#5a6aae',
  PENDING: '#ae9a4a',
  CANCELLED: '#ae5a5a',
};

const STATUS_FR = {
  CONFIRMED: 'Confirmé',
  DONE: 'Terminé',
  PENDING: 'En attente',
  CANCELLED: 'Annulé',
};

const PIE_COLORS = ['#5a9e5a', '#5a6aae', '#ae9a4a', '#ae5a5a'];

const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.10)', padding: '10px 14px', fontFamily: '"Inter Tight",sans-serif', fontSize: 12 }}>
      <p style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>{' '}{p.name}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@800&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

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
    <div className="adash">
      <style>{CSS}</style>

      <div>
        <div className="adash-eyebrow">Admin · Vue globale</div>
        <h1 className="adash-title">Tableau de bord</h1>
        <p className="adash-sub">Activité en temps réel sur l'ensemble de la plateforme.</p>
      </div>

      {/* KPI grid */}
      <div className="adash-kpi-grid">
        {kpiCards.map(({ label, value, icon: Icon, sub, alert }) => (
          <div key={label} className="adash-kpi" style={alert ? { borderColor: '#ae9a4a' } : {}}>
            <div className="adash-kpi-icon" style={alert ? { background: '#f4f0e0', borderColor: '#ae9a4a' } : {}}>
              <Icon size={14} style={{ color: alert ? '#6e5a0a' : '#0a0a0a' }} />
            </div>
            <div className="adash-kpi-val">{value}</div>
            <div className="adash-kpi-label">{label}</div>
            <div style={{ fontSize: 11, color: '#888', fontFamily: '"Inter Tight",sans-serif' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Inscriptions + Appointments trends */}
      <div className="adash-charts-row">
        <div className="adash-panel">
          <p className="adash-panel-title">
            <Users size={11} /> Inscriptions · 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={months} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0a0a0a" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0a0a0a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5a6aae" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#5a6aae" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '.1em', textTransform: 'uppercase' }} />
              <Area type="monotone" dataKey="clients" name="Clients" stroke="#0a0a0a" strokeWidth={1.5} fill="url(#gc)" dot={false} />
              <Area type="monotone" dataKey="intervenants" name="Coachs" stroke="#5a6aae" strokeWidth={1.5} fill="url(#gi)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="adash-panel">
          <p className="adash-panel-title">
            <Calendar size={11} /> Rendez-vous · 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '.1em', textTransform: 'uppercase' }} />
              <Bar dataKey="appointments" name="Total" fill="#d0d0cc" radius={[2, 2, 0, 0]} />
              <Bar dataKey="done" name="Terminés" fill="#0a0a0a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Revenue + Status donut + Top intervenants */}
      <div className="adash-charts-row">
        <div className="adash-panel">
          <p className="adash-panel-title">
            <Euro size={11} /> Revenus plateforme (€) · 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={months} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5a9e5a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#5a9e5a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fill: '#888' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} formatter={(v) => [`${fmt(v)} €`, 'Revenus']} />
              <Area type="monotone" dataKey="revenue" name="Revenus (€)" stroke="#5a9e5a" strokeWidth={1.5} fill="url(#gr)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="adash-panel">
          <p className="adash-panel-title">
            <Clock size={11} /> Répartition des statuts RDV
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={apptByStatus}
                dataKey="count"
                nameKey="status"
                cx="40%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                strokeWidth={0}
              >
                {apptByStatus.map((entry, i) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [v, STATUS_FR[name] || name]}
                contentStyle={{ fontFamily: '"Inter Tight",sans-serif', fontSize: 12, border: '1px solid rgba(0,0,0,.10)' }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(v) => <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#555' }}>{STATUS_FR[v] || v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Top coachs + Recent appointments */}
      <div className="adash-charts-row-3">
        <div className="adash-panel">
          <p className="adash-panel-title">
            <Calendar size={11} /> Derniers rendez-vous
          </p>
          <table className="adash-table">
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
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '24px 0', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>Aucun rendez-vous</td></tr>
              ) : (
                recentAppointments.map((rdv) => (
                  <tr key={rdv.id}>
                    <td style={{ fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rdv.coachService?.name || rdv.service?.name || '—'}
                    </td>
                    <td style={{ color: '#555' }}>{rdv.client?.firstName} {rdv.client?.lastName}</td>
                    <td style={{ color: '#555' }}>{rdv.intervenant?.firstName} {rdv.intervenant?.lastName}</td>
                    <td style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td><span className={`adash-badge ${rdv.status}`}>{STATUS_FR[rdv.status] || rdv.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="adash-panel">
          <p className="adash-panel-title">
            <Star size={11} /> Top coachs · RDV
          </p>
          {topIntervenants.length === 0 ? (
            <p style={{ color: '#888', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>Aucune donnée</p>
          ) : (
            topIntervenants.map((item) => (
              <div key={item.name} className="adash-bar-item">
                <div style={{ minWidth: 100, fontSize: 12, color: '#0a0a0a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div className="adash-bar-track">
                  <div className="adash-bar-fill" style={{ width: `${Math.round((item.count / maxTopCount) * 100)}%` }} />
                </div>
                <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: '#555', minWidth: 24, textAlign: 'right' }}>{item.count}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
