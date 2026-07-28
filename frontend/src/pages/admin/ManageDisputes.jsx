import { useState, useEffect } from 'react';
import { appointmentApi } from '../../services/appointment.api';
import Spinner from '../../components/ui/Spinner';
import { Scale, CheckCircle, XCircle, Euro } from 'lucide-react';
import { DISPUTE_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const FILTERS = [
  ['OPEN', 'En cours'],
  ['ALL', 'Tous'],
];

const MD_CSS = `
  .md-card{border:1px solid var(--line);border-radius:18px;padding:22px 24px;background:#fff}
  .md-card + .md-card{margin-top:14px}
  .md-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px}
  .md-service{font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--ink);margin:0}
  .md-date{font-size:12.5px;color:var(--ink-3);margin:4px 0 0}
  .md-parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  @media(max-width:640px){.md-parties{grid-template-columns:1fr}}
  .md-party{background:#FAF9F7;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
  .md-party-label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px}
  .md-party-name{font-size:14px;font-weight:600;color:var(--ink);margin:0}
  .md-party-mail{font-size:12px;color:var(--ink-3);margin:2px 0 0}
  .md-reason{background:#FBF3E2;border:1px solid #EBD9B4;border-radius:14px;padding:14px 16px;margin-bottom:16px}
  .md-reason-label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8A6212;margin:0 0 7px}
  .md-reason-text{font-size:13.5px;color:var(--ink-2);font-style:italic;line-height:1.6;margin:0}
  .md-reason-date{font-size:12px;color:#8A6212;margin:8px 0 0;opacity:.85}
  .md-amount{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px;color:var(--ink-2);margin-bottom:16px}
  .md-amount b{color:var(--ink);font-weight:700}
  .md-actions{display:flex;flex-wrap:wrap;gap:10px;padding-top:16px;border-top:1px solid var(--line)}
`;

export default function ManageDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  const [resolvingId, setResolvingId] = useState(null);

  const fetchDisputes = () => {
    setLoading(true);
    appointmentApi
      .getDisputes({ status: filter })
      .then(({ data }) => setDisputes(data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDisputes, [filter]);  

  const handleResolve = async (dispute, resolution) => {
    const label = resolution === 'REJECTED'
      ? "Rejeter le litige : l'absence signalée par le coach est confirmée et ses gains sont débloqués."
      : 'Donner raison au client : la séance payée sera intégralement remboursée.';
    if (!window.confirm(label + '\n\nConfirmer ?')) return;

    setResolvingId(dispute.id);
    try {
      await appointmentApi.resolveDispute(dispute.id, resolution);
      toast.success('Litige résolu — les deux parties sont notifiées');
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la résolution');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="dsh-page" style={{ maxWidth: 900 }}>
      <style>{MD_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Litiges</h1>
          <p className="dsh-sub">
            Contestations d'absence — le virement au professionnel est gelé tant que le litige est ouvert
          </p>
        </div>
      </div>

      <div className="dsh-chips">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`dsh-chip${filter === value ? ' is-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : disputes.length === 0 ? (
        <div className="dsh-empty">
          <Scale size={26} />
          Aucun litige {filter === 'OPEN' ? 'en cours' : ''}
        </div>
      ) : (
        <div>
          {disputes.map((d) => (
            <div key={d.id} className="md-card">
              <div className="md-head">
                <div>
                  <p className="md-service">{d.coachService?.name || d.service?.name || 'Séance'}</p>
                  <p className="md-date">
                    {new Date(d.scheduledAt).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`dsh-badge ${d.disputeStatus === 'OPEN' ? 'dsh-badge--wait' : 'dsh-badge--neutral'}`}>
                  <i />{DISPUTE_STATUS_LABELS[d.disputeStatus]}
                </span>
              </div>

              <div className="md-parties">
                <div className="md-party">
                  <p className="md-party-label">Client</p>
                  <p className="md-party-name">{d.client.firstName} {d.client.lastName}</p>
                  <p className="md-party-mail">{d.client.email}</p>
                </div>
                <div className="md-party">
                  <p className="md-party-label">Professionnel</p>
                  <p className="md-party-name">{d.intervenant.firstName} {d.intervenant.lastName}</p>
                  <p className="md-party-mail">{d.intervenant.email}</p>
                </div>
              </div>

              {d.disputeReason && (
                <div className="md-reason">
                  <p className="md-reason-label">Contestation du client</p>
                  <p className="md-reason-text">"{d.disputeReason}"</p>
                  {d.disputedAt && (
                    <p className="md-reason-date">
                      Ouvert le {new Date(d.disputedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {d.payment && (
                <p className="md-amount">
                  <Euro size={15} style={{ color: '#8a8781' }} />
                  Montant payé : <b>{(d.payment.amount / 100).toFixed(2)} €</b>
                  <span style={{ color: '#8a8781' }}>
                    (part coach {(d.payment.intervenantShare / 100).toFixed(2)} €)
                  </span>
                  {d.payment.refundAmount != null && (
                    <span className="dsh-badge dsh-badge--ok">
                      Remboursé {(d.payment.refundAmount / 100).toFixed(2)} €
                    </span>
                  )}
                </p>
              )}
              {!d.payment && d.coveredByCompany && (
                <p className="dsh-card-sub" style={{ marginBottom: 16 }}>
                  Séance couverte par l'entreprise (aucun paiement direct).
                </p>
              )}

              {d.disputeStatus === 'OPEN' && (
                <div className="md-actions">
                  <button
                    type="button"
                    className="dsh-btn dsh-btn--ghost dsh-btn--sm"
                    disabled={resolvingId === d.id}
                    onClick={() => handleResolve(d, 'REJECTED')}
                  >
                    <XCircle size={14} />
                    Rejeter (absence confirmée)
                  </button>
                  <button
                    type="button"
                    className="dsh-btn dsh-btn--orange dsh-btn--sm"
                    disabled={resolvingId === d.id}
                    onClick={() => handleResolve(d, 'RESOLVED_CLIENT')}
                  >
                    <CheckCircle size={14} />
                    {resolvingId === d.id
                      ? 'Traitement…'
                      : `Donner raison au client${d.payment ? ' (remboursement intégral)' : ''}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
