import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { documentApi } from '../../services/document.api';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Upload, FileText, Trash2, CheckCircle, Clock, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';

const DOC_TYPES = [
  { value: 'ID_CARD', label: "Pièce d'identité", desc: "Carte nationale d'identité ou passeport", required: true },
  { value: 'DIPLOMA', label: 'Diplômes / Certifications', desc: 'Ajoutez tous vos diplômes et certifications professionnelles', required: true },
  { value: 'OTHER', label: 'Autre document', desc: 'Tout autre justificatif utile', required: false },
];

const TYPE_LABELS = { ID_CARD: "Pièce d'identité", DIPLOMA: 'Diplôme', OTHER: 'Autre' };

// Statut de chaque document, tel que décidé par l'admin
const DOC_STATUS_BADGE = {
  PENDING:   { cls: 'dsh-badge--wait', label: 'En attente de validation', Icon: Clock },
  VALIDATED: { cls: 'dsh-badge--ok', label: 'Validé', Icon: CheckCircle },
  REJECTED:  { cls: 'dsh-badge--err', label: 'Refusé', Icon: XCircle },
  EXPIRED:   { cls: 'dsh-badge--neutral', label: 'Expiré', Icon: AlertTriangle },
};

const UD_CSS = `
  .ud-banner{border-radius:16px;padding:16px 20px;display:flex;align-items:flex-start;gap:13px;margin-bottom:18px}
  .ud-banner p{margin:0}
  .ud-banner-title{font-size:14px;font-weight:700}
  .ud-banner-text{font-size:13px;line-height:1.55;margin-top:5px!important}

  .ud-type{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:#fff}
  .ud-type + .ud-type{margin-top:12px}
  .ud-type-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}
  .ud-type-name{font-size:14.5px;font-weight:600;color:var(--ink);margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ud-req{font-size:11.5px;font-weight:600;color:#C0392B}
  .ud-type-desc{font-size:12.5px;color:var(--ink-3);margin:4px 0 0}
  .ud-upload{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:999px;background:var(--orange);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;flex-shrink:0;transition:transform .15s ease,opacity .2s}
  .ud-upload:hover{transform:translateY(-1px)}
  .ud-upload.is-off{background:#F2F1ED;color:var(--ink-3);cursor:not-allowed;transform:none}

  .ud-file{display:flex;align-items:center;gap:12px;border-radius:12px;padding:12px 14px;border:1px solid var(--line);background:#FAF9F7}
  .ud-file + .ud-file{margin-top:8px}
  .ud-file--pending{background:#FEF1EA;border-color:#F7D3C0}
  .ud-file-name{font-size:13.5px;font-weight:500;color:var(--ink);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ud-file-meta{font-size:11.5px;color:var(--ink-3);margin:2px 0 0}
  .ud-icon-btn{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:border-color .15s,color .15s,background .15s}
  .ud-icon-btn:hover:not(:disabled){border-color:#EFC7BE;color:#C0392B;background:#FBEAE7}
  .ud-icon-btn:disabled{opacity:.5;cursor:not-allowed}
  .ud-note{font-size:12px;line-height:1.5;border-radius:10px;padding:9px 12px;margin:8px 0 0}
  .ud-note--err{color:#A5342A;background:#FBEAE7;border:1px solid #EFC7BE}
  .ud-note--info{color:var(--ink-3);font-style:italic;padding-left:0}
  .ud-hint{font-size:12px;color:var(--ink-3);font-style:italic;margin:0}

  .ud-summary{border-radius:16px;padding:16px 20px;display:flex;align-items:center;gap:12px;font-size:13.5px;font-weight:600}
  .ud-summary--ok{background:#EAF3EC;border:1px solid #CDE4D3;color:#28643B}
  .ud-summary--warn{background:#FBF3E2;border:1px solid #EBD9B4;color:#8A6212}
  .ud-summary--neutral{background:#FAF9F7;border:1px solid var(--line);color:var(--ink-2)}
`;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function UploadDocuments() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState({});
  const [deleting, setDeleting] = useState(null);

  const dashPath = user?.role === 'INTERVENANT' ? '/dashboard/intervenant' : '/dashboard/entreprise';

  const fetchDocs = () => {
    documentApi.getMine()
      .then(({ data }) => setDocuments(data))
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  };

  useEffect(fetchDocs, []);

  // pendingFiles : { [type]: File[] } — on peut sélectionner plusieurs
  // fichiers par type (ex. plusieurs diplômes, recto/verso d'une pièce d'identité)
  const handleFileSelect = (type, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingFiles(prev => ({ ...prev, [type]: [...(prev[type] || []), ...files] }));
    e.target.value = '';
  };

  const handleRemovePending = (type, index) => {
    setPendingFiles(prev => {
      const remaining = (prev[type] || []).filter((_, i) => i !== index);
      const next = { ...prev };
      if (remaining.length === 0) delete next[type];
      else next[type] = remaining;
      return next;
    });
  };

  const pendingCount = Object.values(pendingFiles).reduce((sum, files) => sum + files.length, 0);

  const handleSubmit = async () => {
    if (pendingCount === 0) return;

    setUploading(true);
    let hasError = false;
    const failed = {};
    const uploadedTypes = new Set();
    for (const [type, files] of Object.entries(pendingFiles)) {
      for (const file of files) {
        try {
          await documentApi.upload(type, file);
          uploadedTypes.add(type);
        } catch (err) {
          hasError = true;
          failed[type] = [...(failed[type] || []), file];
          toast.error(`Erreur (${TYPE_LABELS[type]} — ${file.name}) : ${err.response?.data?.message || 'Erreur lors de l\'envoi'}`);
        }
      }
    }

    if (!hasError) {
      // État du dossier après cet envoi : documents déjà en base + fichiers envoyés
      const dossierTypes = new Set([...documents.map((d) => d.type), ...uploadedTypes]);
      const missing = [];
      if (!dossierTypes.has('ID_CARD')) missing.push("votre pièce d'identité");
      if (!dossierTypes.has('DIPLOMA')) missing.push('au moins un diplôme');

      if (missing.length > 0) {
        toast(
          `Documents envoyés, mais votre dossier est incomplet : il manque ${missing.join(' et ')}.`,
          { icon: '⚠️', duration: 6000 }
        );
      } else {
        toast.success('Documents envoyés — votre dossier est complet !');
      }
    }

    // Ne garde en attente que les fichiers dont l'envoi a échoué
    setPendingFiles(failed);

    fetchDocs();
    if (refreshUser) refreshUser();
    setUploading(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await documentApi.remove(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const hasIdCard = documents.some((d) => d.type === 'ID_CARD');
  const hasDiploma = documents.some((d) => d.type === 'DIPLOMA');
  // Dossier complet = pièce d'identité + au moins un diplôme
  const dossierComplet = hasIdCard && hasDiploma;

  const summaryClass = dossierComplet
    ? 'ud-summary--ok'
    : documents.length > 0
      ? 'ud-summary--warn'
      : 'ud-summary--neutral';

  return (
    <div className="dsh-card">
      <style>{UD_CSS}</style>

      {/* Vérification refusée */}
      {user?.verificationStatus === 'REJECTED' && (
        <div className="ud-banner" style={{ background: '#FBEAE7', border: '1px solid #EFC7BE', color: '#A5342A' }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="ud-banner-title">Vérification refusée</p>
            <p className="ud-banner-text">
              Vos documents n'ont pas pu être validés pour la raison suivante :<br />
              <strong>"{user.verificationNote || 'Documents non conformes'}"</strong>
            </p>
            <p className="ud-banner-text" style={{ fontWeight: 600 }}>
              Veuillez renvoyer vos documents pour soumettre une nouvelle demande.
            </p>
          </div>
        </div>
      )}

      {/* Vérification en attente */}
      {user?.verificationStatus === 'PENDING' && (
        <div className="ud-banner" style={{ background: '#FBF3E2', border: '1px solid #EBD9B4', color: '#8A6212' }}>
          <Clock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="ud-banner-title">Compte en attente de vérification</p>
            <p className="ud-banner-text">
              Votre compte sera activé après vérification de vos documents par notre équipe
              (généralement sous 24 h). Vous pouvez accéder à votre tableau de bord en attendant.
            </p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2 className="dsh-card-title">Vérification de votre compte</h2>
        <p className="dsh-card-sub" style={{ lineHeight: 1.55, maxWidth: 560 }}>
          Déposez vos documents pour accélérer la validation de votre profil.
          {user?.role === 'INTERVENANT' && " Une pièce d'identité et au moins un diplôme sont obligatoires."}
        </p>
      </div>

      {/* Types de documents */}
      <div style={{ marginBottom: 20 }}>
        {DOC_TYPES.map(({ value, label, desc, required }) => {
          const existing = documents.filter((d) => d.type === value);
          return (
            <div key={value} className="ud-type">
              <div className="ud-type-head">
                <div>
                  <p className="ud-type-name">
                    {label}
                    {required && <span className="ud-req">* obligatoire</span>}
                  </p>
                  <p className="ud-type-desc">{desc}</p>
                </div>
                <label className={`ud-upload${uploading ? ' is-off' : ''}`}>
                  <Upload size={14} />
                  Ajouter
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    disabled={uploading}
                    onChange={(e) => handleFileSelect(value, e)}
                  />
                </label>
              </div>

              {pendingFiles[value]?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {pendingFiles[value].map((file, index) => (
                    <div key={`${file.name}-${index}`} className="ud-file ud-file--pending">
                      <FileText size={15} style={{ color: '#F4530F', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="ud-file-name">{file.name}</p>
                        <p className="ud-file-meta">{formatSize(file.size)} · en attente d'envoi</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(value, index)}
                        disabled={uploading}
                        className="ud-icon-btn"
                        title="Retirer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existing.length > 0 && (
                <div>
                  {existing.map((doc) => {
                    const badge = DOC_STATUS_BADGE[doc.status] || DOC_STATUS_BADGE.PENDING;
                    const BadgeIcon = badge.Icon;
                    return (
                      <div key={doc.id} className="ud-file" style={{ flexWrap: 'wrap' }}>
                        <FileText size={15} style={{ color: '#8a8781', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <p className="ud-file-name">{doc.originalName}</p>
                          <p className="ud-file-meta">
                            {formatSize(doc.sizeBytes)}
                            {doc.expiresAt && ` · expire le ${new Date(doc.expiresAt).toLocaleDateString('fr-FR')}`}
                          </p>
                        </div>
                        <span className={`dsh-badge ${badge.cls}`}>
                          <BadgeIcon size={12} />{badge.label}
                        </span>
                        {doc.status !== 'VALIDATED' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleting === doc.id || uploading}
                            className="ud-icon-btn"
                            title="Supprimer ce document"
                          >
                            {deleting === doc.id ? <Spinner size="sm" /> : <Trash2 size={13} />}
                          </button>
                        )}
                        {doc.status === 'REJECTED' && doc.adminNote && (
                          <p className="ud-note ud-note--err" style={{ width: '100%' }}>
                            <strong>Motif du refus :</strong> {doc.adminNote}
                          </p>
                        )}
                        {doc.status !== 'REJECTED' && doc.adminNote && (
                          <p className="ud-note ud-note--info" style={{ width: '100%' }}>
                            Note : {doc.adminNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {existing.length === 0 && !pendingFiles[value]?.length && (
                <p className="ud-hint">
                  Aucun document envoyé — PDF, JPG ou PNG, max 5 Mo. Vous pouvez sélectionner plusieurs fichiers.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {loadingDocs && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Spinner /></div>
      )}

      {/* Envoi */}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          className="dsh-btn dsh-btn--orange"
          style={{ width: '100%', marginBottom: 18 }}
        >
          {uploading
            ? 'Envoi…'
            : pendingCount > 1
              ? `Envoyer les ${pendingCount} documents sélectionnés`
              : 'Envoyer le document sélectionné'}
        </button>
      )}

      {/* Résumé */}
      <div className={`ud-summary ${summaryClass}`} style={{ marginBottom: 16 }}>
        <CheckCircle size={17} style={{ flexShrink: 0 }} />
        <span>
          {dossierComplet
            ? `${documents.length} document${documents.length > 1 ? 's' : ''} envoyé${documents.length > 1 ? 's' : ''} — votre dossier est complet`
            : !hasIdCard && !hasDiploma
              ? "Envoyez votre pièce d'identité et au moins un diplôme"
              : !hasIdCard
                ? "Dossier incomplet — il manque votre pièce d'identité"
                : 'Dossier incomplet — il manque au moins un diplôme ou une certification'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigate(dashPath)}
        className={`dsh-btn ${dossierComplet ? 'dsh-btn--orange' : 'dsh-btn--ghost'}`}
        style={{ width: '100%' }}
      >
        {dossierComplet ? 'Accéder à mon tableau de bord' : "Passer cette étape pour l'instant"}
      </button>
    </div>
  );
}
