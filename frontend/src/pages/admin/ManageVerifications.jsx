import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../../services/user.api';
import { documentApi } from '../../services/document.api';
import Spinner from '../../components/ui/Spinner';
import { MODAL_CSS } from '../../components/ui/modalStyles';
import toast from 'react-hot-toast';
import { FileText, Building2, Download, CheckCircle, XCircle, ChevronDown, ChevronUp, Eye, X, Clock, AlertTriangle } from 'lucide-react';

const ROLE_LABEL = { INTERVENANT: 'Coach / Intervenant', ENTREPRISE: 'Entreprise' };
const TYPE_LABELS = { ID_CARD: "Pièce d'identité", DIPLOMA: 'Diplôme', RC_PRO: 'RC Professionnelle', OTHER: 'Autre' };

const DOC_STATUS_BADGE = {
  PENDING:   { cls: 'dsh-badge--wait',    label: 'En attente', Icon: Clock },
  VALIDATED: { cls: 'dsh-badge--ok',      label: 'Validé',     Icon: CheckCircle },
  REJECTED:  { cls: 'dsh-badge--err',     label: 'Refusé',     Icon: XCircle },
  EXPIRED:   { cls: 'dsh-badge--neutral', label: 'Expiré',     Icon: AlertTriangle },
};

const MV_CSS = `
  .mv-card{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
  .mv-card + .mv-card{margin-top:12px}
  .mv-head{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit;transition:background .15s;flex-wrap:wrap}
  .mv-head:hover{background:#FAF9F7}
  .mv-head-left{display:flex;align-items:center;gap:14px;flex-wrap:wrap;min-width:0}
  .mv-name{font-size:14.5px;font-weight:600;color:var(--ink);margin:0}
  .mv-mail{font-size:12px;color:var(--ink-3);margin:2px 0 0}
  .mv-company{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--ink-3)}
  .mv-head-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
  .mv-body{padding:20px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:18px}

  .mv-doc{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#FAF9F7}
  .mv-doc + .mv-doc{margin-top:10px}
  .mv-doc-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .mv-doc-type{font-size:13.5px;font-weight:600;color:var(--ink);margin:0}
  .mv-doc-meta{font-size:12px;color:var(--ink-3);margin:2px 0 0;overflow:hidden;text-overflow:ellipsis}
  .mv-doc-note{font-size:12px;color:#A87616;font-style:italic;margin:4px 0 0}
  .mv-icon-btn{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:border-color .15s,color .15s}
  .mv-icon-btn:hover{border-color:var(--orange);color:var(--orange)}
  .mv-doc-actions{display:flex;flex-direction:column;gap:10px;padding-top:12px;margin-top:12px;border-top:1px solid var(--line)}
  .mv-doc-inputs{display:flex;gap:8px;flex-wrap:wrap}
  .mv-doc-inputs .dsh-input{flex:1;min-width:180px;height:40px;font-size:13px}
  .mv-doc-inputs input[type=date]{width:auto;flex:0 0 auto}
  .mv-doc-btns{display:flex;gap:8px}
  .mv-doc-btns .dsh-btn{flex:1}
  .mv-label{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px}

  .mv-preview{position:relative;width:100%;max-width:820px;max-height:90vh;background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(15,15,15,.22)}
  .mv-preview-body{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;background:#FAF9F7;min-height:0}
  .mv-preview-body img{max-width:100%;max-height:70vh;object-fit:contain;padding:16px}
  .mv-preview-body iframe{width:100%;height:100%;min-height:60vh;border:none}
`;

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function PreviewModal({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentApi.download(doc.id)
      .then(({ data }) => {
        const url = URL.createObjectURL(new Blob([data], { type: doc.mimeType }));
        setBlobUrl(url);
      })
      .catch(() => toast.error('Impossible de charger l\'aperçu'))
      .finally(() => setLoading(false));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <div className="gm-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{MODAL_CSS}</style>
      <div className="mv-preview">
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon"><FileText size={17} /></div>
            <div style={{ minWidth: 0 }}>
              <h2 className="gm-title">{TYPE_LABELS[doc.type] || doc.type}</h2>
              <p className="gm-summary-line">{doc.originalName} · {formatSize(doc.sizeBytes)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="mv-preview-body">
          {loading ? (
            <Spinner size="lg" />
          ) : !blobUrl ? (
            <p className="gm-hint">Impossible de charger le document</p>
          ) : isPdf ? (
            <iframe src={blobUrl} title={doc.originalName} />
          ) : (
            <img src={blobUrl} alt={doc.originalName} />
          )}
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, onDecision }) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [note, setNote] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [docProcessing, setDocProcessing] = useState({});
  const [docNotes, setDocNotes] = useState({});
  const [docExpiries, setDocExpiries] = useState({});
  const [docs, setDocs] = useState(user.documents || []);

  const handleDecision = async (status) => {
    setProcessing(true);
    try {
      await onDecision(user.id, status, note);
    } finally {
      setProcessing(false);
    }
  };

  const handleDocStatus = async (docId, status) => {
    setDocProcessing((p) => ({ ...p, [docId]: true }));
    try {
      const { data } = await documentApi.updateStatus(docId, {
        status,
        adminNote: docNotes[docId] || undefined,
        expiresAt: docExpiries[docId] || undefined,
      });
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, ...data } : d));
      toast.success(status === 'VALIDATED' ? 'Document validé' : 'Document refusé');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setDocProcessing((p) => ({ ...p, [docId]: false }));
    }
  };

  const handleDownload = async (docId, originalName, mimeType) => {
    try {
      const { data } = await documentApi.download(docId);
      const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const closePreview = useCallback(() => setPreviewDoc(null), []);

  return (
    <>
      {previewDoc && <PreviewModal doc={previewDoc} onClose={closePreview} />}

      <div className="mv-card">
        <button type="button" className="mv-head" onClick={() => setOpen((o) => !o)}>
          <div className="mv-head-left">
            <div className="dsh-ini">{user.firstName[0]}{user.lastName[0]}</div>
            <div style={{ minWidth: 0 }}>
              <p className="mv-name">{user.firstName} {user.lastName}</p>
              <p className="mv-mail">{user.email}</p>
            </div>
            <span className={`dsh-badge ${user.role === 'INTERVENANT' ? 'dsh-badge--orange' : 'dsh-badge--ok'}`}>
              {ROLE_LABEL[user.role]}
            </span>
            {user.companyName && (
              <span className="mv-company">
                <Building2 size={13} />{user.companyName}
              </span>
            )}
          </div>
          <div className="mv-head-right">
            <span className="dsh-table-muted" style={{ fontSize: 12.5 }}>{formatDate(user.createdAt)}</span>
            <span className="dsh-badge dsh-badge--wait">
              <i />{user.documents.length} doc{user.documents.length !== 1 ? 's' : ''}
            </span>
            {open ? <ChevronUp size={16} style={{ color: '#8a8781' }} /> : <ChevronDown size={16} style={{ color: '#8a8781' }} />}
          </div>
        </button>

        {open && (
          <div className="mv-body">
            {user.siret && (
              <p className="dsh-card-sub" style={{ margin: 0 }}>
                <strong style={{ color: '#171614' }}>SIRET :</strong> {user.siret}
              </p>
            )}

            {/* Documents */}
            {docs.length === 0 ? (
              <p className="dsh-card-sub" style={{ margin: 0, fontStyle: 'italic' }}>Aucun document envoyé</p>
            ) : (
              <div>
                <p className="mv-label">Documents</p>
                {docs.map((doc) => {
                  const badge = DOC_STATUS_BADGE[doc.status] || DOC_STATUS_BADGE.PENDING;
                  const BadgeIcon = badge.Icon;
                  return (
                    <div key={doc.id} className="mv-doc">
                      <div className="mv-doc-row">
                        <FileText size={16} style={{ color: '#8a8781', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <p className="mv-doc-type">{TYPE_LABELS[doc.type] || doc.type}</p>
                          <p className="mv-doc-meta">{doc.originalName} · {formatSize(doc.sizeBytes)}</p>
                          {doc.expiresAt && (
                            <p className="mv-doc-meta">Expire le {formatDate(doc.expiresAt)}</p>
                          )}
                          {doc.adminNote && <p className="mv-doc-note">Note : {doc.adminNote}</p>}
                        </div>
                        <span className={`dsh-badge ${badge.cls}`}>
                          <BadgeIcon size={12} />{badge.label}
                        </span>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button type="button" onClick={() => setPreviewDoc(doc)} className="mv-icon-btn" title="Aperçu">
                            <Eye size={14} />
                          </button>
                          <button type="button" onClick={() => handleDownload(doc.id, doc.originalName, doc.mimeType)} className="mv-icon-btn" title="Télécharger">
                            <Download size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Validation par document */}
                      {doc.status !== 'VALIDATED' && (
                        <div className="mv-doc-actions">
                          <div className="mv-doc-inputs">
                            <input
                              type="text"
                              className="dsh-input"
                              placeholder="Note admin (optionnelle)"
                              value={docNotes[doc.id] || ''}
                              onChange={(e) => setDocNotes((n) => ({ ...n, [doc.id]: e.target.value }))}
                            />
                            <input
                              type="date"
                              className="dsh-input"
                              title="Date d'expiration (optionnelle)"
                              value={docExpiries[doc.id] || ''}
                              onChange={(e) => setDocExpiries((ex) => ({ ...ex, [doc.id]: e.target.value }))}
                            />
                          </div>
                          <div className="mv-doc-btns">
                            <button
                              type="button"
                              disabled={docProcessing[doc.id]}
                              onClick={() => handleDocStatus(doc.id, 'VALIDATED')}
                              className="dsh-btn dsh-btn--orange dsh-btn--sm"
                            >
                              <CheckCircle size={14} />Valider
                            </button>
                            <button
                              type="button"
                              disabled={docProcessing[doc.id]}
                              onClick={() => handleDocStatus(doc.id, 'REJECTED')}
                              className="dsh-btn dsh-btn--danger dsh-btn--sm"
                            >
                              <XCircle size={14} />Refuser
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Note de refus optionnelle */}
            <div>
              <label className="dsh-label" htmlFor={`note-${user.id}`}>
                Note (optionnelle, visible par l'utilisateur en cas de refus)
              </label>
              <textarea
                id={`note-${user.id}`}
                className="dsh-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Motif de refus ou commentaire..."
              />
            </div>

            {/* Décision globale */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDecision('VERIFIED')}
                disabled={processing}
                className="dsh-btn dsh-btn--orange"
                style={{ flex: 1 }}
              >
                <CheckCircle size={15} />
                {processing ? 'Traitement…' : 'Approuver'}
              </button>
              <button
                type="button"
                onClick={() => handleDecision('REJECTED')}
                disabled={processing}
                className="dsh-btn dsh-btn--danger-solid"
                style={{ flex: 1 }}
              >
                <XCircle size={15} />
                Refuser
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ManageVerifications() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    userApi
      .getPendingVerifications()
      .then(({ data }) => setUsers(data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []); // eslint-disable-line react-hooks/set-state-in-effect

  const handleDecision = async (id, status, note) => {
    try {
      await userApi.verifyUser(id, status, note);
      toast.success(status === 'VERIFIED' ? 'Compte approuvé' : 'Compte refusé');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      toast.error('Erreur lors de la décision');
    }
  };

  return (
    <div className="dsh-page">
      <style>{MV_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Vérifications en attente</h1>
          <p className="dsh-sub">
            {users.length} compte{users.length !== 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="dsh-empty">
          <CheckCircle size={26} style={{ color: '#2F7A47' }} />
          <span>Aucune vérification en attente</span>
          <span style={{ fontWeight: 400 }}>Tous les comptes ont été traités</span>
        </div>
      ) : (
        <div>
          {users.map((u) => (
            <UserCard key={u.id} user={u} onDecision={handleDecision} />
          ))}
        </div>
      )}
    </div>
  );
}
