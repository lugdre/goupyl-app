import { useState, useEffect } from 'react';
import { paymentApi } from '../../services/payment.api';
import Spinner from '../../components/ui/Spinner';
import { CreditCard, CheckCircle, AlertTriangle, ExternalLink, Euro, Calendar, Clock, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

const PY_CSS = `
  .py-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:900px){.py-kpis{grid-template-columns:1fr}}
  .py-kpi{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:#fff;display:flex;align-items:center;gap:16px}
  .py-kpi-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .py-kpi-label{font-size:12.5px;color:var(--ink-3);margin:0}
  .py-kpi-value{font-size:26px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin:4px 0 0;line-height:1}
  .py-kpi-hint{font-size:11.5px;color:var(--ink-3);margin:5px 0 0}

  .py-setup{display:flex;align-items:flex-start;gap:16px}
  .py-setup-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .py-steps{background:#FAF9F7;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:16px 0}
  .py-step{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--ink-2);line-height:1.5}
  .py-step + .py-step{margin-top:10px}
  .py-step span{width:22px;height:22px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;flex-shrink:0;margin-top:1px}

  .py-table-wrap{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
  .py-scroll{overflow-x:auto}
  .py-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:640px}
  .py-table th{text-align:left;padding:13px 18px;font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);background:#FAF9F7;border-bottom:1px solid var(--line);white-space:nowrap}
  .py-table th.num,.py-table td.num{text-align:right}
  .py-table td{padding:14px 18px;color:var(--ink-2);border-bottom:1px solid #F0EFEB}
  .py-table tr:last-child td{border-bottom:none}
  .py-table tbody tr:hover{background:#FAF9F7}
  .py-table .py-client{font-weight:600;color:var(--ink)}
  .py-table .py-share{font-weight:700;color:#2F7A47}
  .py-date{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}

  .py-section-title{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:700;letter-spacing:-.01em;color:var(--ink);margin:0 0 6px}
`;

function PaymentsTable({ rows, emptyText }) {
  if (rows.length === 0) {
    return (
      <div className="dsh-empty">
        <Euro size={26} />
        {emptyText}
      </div>
    );
  }
  return (
    <div className="py-table-wrap">
      <div className="py-scroll">
        <table className="py-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Service</th>
              <th className="num">Total</th>
              <th className="num">Votre part (70%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.appointmentId}>
                <td>
                  <span className="py-date">
                    <Calendar size={13} style={{ color: '#8a8781' }} />
                    {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </td>
                <td className="py-client">{p.clientName}</td>
                <td>{p.serviceName}</td>
                <td className="num">{(p.amount / 100).toFixed(2)} &euro;</td>
                <td className="num py-share">{(p.intervenantShare / 100).toFixed(2)} &euro;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Section gains — montée uniquement quand le compte Stripe est actif.
function EarningsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi
      .getMyEarnings()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Erreur de chargement des gains'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const payments = data?.payments || [];
  const pending = data?.pending || [];
  const frozen = data?.frozen || [];
  const totalEarned = data?.totalEarned || 0;
  const totalPending = data?.totalPending || 0;
  const totalFrozen = data?.totalFrozen || 0;

  return (
    <div className="dsh-page">
      <div>
        <h2 className="dsh-h1" style={{ fontSize: 20 }}>Mes gains</h2>
        <p className="dsh-sub">Historique de vos paiements et montants en attente</p>
      </div>

      {/* Indicateurs */}
      <div className="py-kpis">
        <div className="py-kpi">
          <div className="py-kpi-icon" style={{ background: '#EAF3EC', color: '#2F7A47' }}>
            <Euro size={20} />
          </div>
          <div>
            <p className="py-kpi-label">Total encaissé</p>
            <p className="py-kpi-value">{(totalEarned / 100).toFixed(2)} &euro;</p>
          </div>
        </div>
        <div className="py-kpi">
          <div className="py-kpi-icon" style={{ background: '#FBF0DF', color: '#A87616' }}>
            <Clock size={20} />
          </div>
          <div>
            <p className="py-kpi-label">En attente</p>
            <p className="py-kpi-value" style={{ color: '#A87616' }}>{(totalPending / 100).toFixed(2)} &euro;</p>
            <p className="py-kpi-hint">Libéré après la séance</p>
          </div>
        </div>
        <div className="py-kpi">
          <div className="py-kpi-icon" style={{ background: '#FEF1EA', color: '#F4530F' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <p className="py-kpi-label">Séances payées</p>
            <p className="py-kpi-value">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Gains gelés — séances sous litige */}
      {frozen.length > 0 && (
        <div>
          <h3 className="py-section-title">
            <Scale size={18} style={{ color: '#C0392B' }} />
            Gains gelés (litiges en cours) — {(totalFrozen / 100).toFixed(2)} &euro;
          </h3>
          <p className="dsh-sub" style={{ marginBottom: 14 }}>
            Un client conteste l'absence signalée sur ces séances. Les montants seront débloqués
            (ou remboursés) après arbitrage par l'équipe Goupyl Sport.
          </p>
          <PaymentsTable rows={frozen} emptyText="" />
        </div>
      )}

      {/* En attente de réalisation */}
      {pending.length > 0 && (
        <div>
          <h3 className="py-section-title">
            <Clock size={18} style={{ color: '#A87616' }} />
            En attente de réalisation
          </h3>
          <p className="dsh-sub" style={{ marginBottom: 14 }}>
            Ces séances sont payées. Le montant vous sera versé une fois la séance marquée comme terminée.
          </p>
          <PaymentsTable rows={pending} emptyText="" />
        </div>
      )}

      {/* Paiements encaissés */}
      <div>
        <h3 className="py-section-title">Paiements encaissés</h3>
        <div style={{ marginTop: 14 }}>
          <PaymentsTable rows={payments} emptyText="Aucun paiement encaissé pour le moment" />
        </div>
      </div>
    </div>
  );
}

export default function MyPayments() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const checkStatus = () => {
    setLoading(true);
    paymentApi
      .checkOnboardingStatus()
      .then(({ data }) => setStatus(data))
      .catch(() => toast.error('Erreur lors de la verification du statut'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkStatus(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const handleOnboard = async () => {
    setOnboarding(true);
    try {
      const { data } = await paymentApi.onboard();
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la configuration');
      setOnboarding(false);
    }
  };

  if (loading) return <Spinner />;

  const isActive = status?.status === 'active';

  return (
    <div className="dsh-page" style={{ maxWidth: 1000 }}>
      <style>{PY_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Paiements &amp; gains</h1>
          <p className="dsh-sub">Configurez votre compte de paiement, puis suivez vos gains</p>
        </div>
      </div>

      {/* ── Paramétrage du compte Stripe ───────────────── */}
      {isActive ? (
        <div className="dsh-card">
          <div className="py-setup">
            <div className="py-setup-icon" style={{ background: '#EAF3EC', color: '#2F7A47' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <h2 className="dsh-card-title">Compte de paiement actif</h2>
              <p className="dsh-card-sub" style={{ lineHeight: 1.55, maxWidth: 560 }}>
                Votre compte Stripe est configuré et prêt à recevoir des paiements.
                Les clients peuvent désormais payer leurs séances en ligne.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <span className="dsh-badge dsh-badge--ok"><i />Paiements actifs</span>
                <span className="dsh-badge dsh-badge--ok"><i />Virements actifs</span>
              </div>
            </div>
          </div>
        </div>
      ) : status?.status === 'pending' ? (
        <div className="dsh-card">
          <div className="py-setup">
            <div className="py-setup-icon" style={{ background: '#FBF0DF', color: '#A87616' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="dsh-card-title">Vérification en cours</h2>
              <p className="dsh-card-sub" style={{ lineHeight: 1.55, maxWidth: 560 }}>
                Votre compte Stripe est en cours de vérification. Cela peut prendre quelques minutes.
                Si la vérification prend trop de temps, vous pouvez compléter les informations manquantes.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={checkStatus}>
                  Rafraîchir le statut
                </button>
                <button type="button" className="dsh-btn dsh-btn--orange dsh-btn--sm" onClick={handleOnboard} disabled={onboarding}>
                  <ExternalLink size={14} />
                  {onboarding ? 'Redirection…' : 'Compléter les informations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dsh-card">
          <div className="py-setup">
            <div className="py-setup-icon" style={{ background: '#FEF1EA', color: '#F4530F' }}>
              <CreditCard size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="dsh-card-title">Configurez vos paiements</h2>
              <p className="dsh-card-sub" style={{ lineHeight: 1.55, maxWidth: 560 }}>
                Pour recevoir les paiements de vos clients, vous devez connecter votre compte bancaire
                via notre partenaire de paiement sécurisé Stripe.
              </p>

              <div className="py-steps">
                <p className="dsh-card-sub" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Comment ça marche
                </p>
                <div className="py-step">
                  <span>1</span>
                  Cliquez sur le bouton ci-dessous pour créer votre compte Stripe
                </div>
                <div className="py-step">
                  <span>2</span>
                  Renseignez vos informations bancaires en toute sécurité
                </div>
                <div className="py-step">
                  <span>3</span>
                  Recevez 70 % du montant de chaque séance directement sur votre compte
                </div>
              </div>

              <button type="button" className="dsh-btn dsh-btn--orange" onClick={handleOnboard} disabled={onboarding}>
                <CreditCard size={15} />
                {onboarding ? 'Redirection…' : 'Configurer les paiements'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gains (une fois le compte actif) ─────────── */}
      {isActive && (
        <>
          <hr className="dsh-sep" />
          <EarningsSection />
        </>
      )}
    </div>
  );
}
