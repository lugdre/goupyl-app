import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../../services/user.api';
import { documentApi } from '../../services/document.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { ShieldCheck, FileText, Building2, Download, CheckCircle, XCircle, ChevronDown, ChevronUp, Eye, X, Clock, AlertTriangle } from 'lucide-react';

const ROLE_LABEL = { INTERVENANT: 'Coach / Intervenant', ENTREPRISE: 'Entreprise' };
const TYPE_LABELS = { ID_CARD: "Pièce d'identité", DIPLOMA: 'Diplôme', RC_PRO: 'RC Professionnelle', OTHER: 'Autre' };

const DOC_STATUS_BADGE = {
  PENDING:   { cls: 'bg-amber-100 text-amber-700',  label: 'En attente',  Icon: Clock },
  VALIDATED: { cls: 'bg-green-100 text-green-700',  label: 'Validé',      Icon: CheckCircle },
  REJECTED:  { cls: 'bg-red-100 text-red-700',      label: 'Refusé',      Icon: XCircle },
  EXPIRED:   { cls: 'bg-gray-100 text-gray-500',    label: 'Expiré',      Icon: AlertTriangle },
};

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
  }, [doc.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-900">{TYPE_LABELS[doc.type] || doc.type}</p>
            <p className="text-xs text-gray-400">{doc.originalName} · {formatSize(doc.sizeBytes)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 min-h-0">
          {loading ? (
            <Spinner size="lg" />
          ) : !blobUrl ? (
            <p className="text-gray-400 text-sm">Impossible de charger le document</p>
          ) : isPdf ? (
            <iframe src={blobUrl} className="w-full h-full min-h-[60vh]" title={doc.originalName} />
          ) : (
            <img src={blobUrl} alt={doc.originalName} className="max-w-full max-h-[70vh] object-contain p-4" />
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

      <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            user.role === 'INTERVENANT' ? 'bg-nature-50 text-nature-700' : 'bg-brand-50 text-brand-600'
          }`}>
            {ROLE_LABEL[user.role]}
          </span>
          {user.companyName && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />{user.companyName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400">{formatDate(user.createdAt)}</span>
          <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
            {user.documents.length} doc{user.documents.length !== 1 ? 's' : ''}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {/* Info */}
          {user.siret && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">SIRET :</span>
              <span className="font-mono font-medium text-gray-700">{user.siret}</span>
            </div>
          )}

          {/* Documents */}
          {docs.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun document envoyé</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents</p>
              {docs.map((doc) => {
                const badge = DOC_STATUS_BADGE[doc.status] || DOC_STATUS_BADGE.PENDING;
                const BadgeIcon = badge.Icon;
                return (
                  <div key={doc.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 font-medium">{TYPE_LABELS[doc.type] || doc.type}</p>
                        <p className="text-xs text-gray-400 truncate">{doc.originalName} · {formatSize(doc.sizeBytes)}</p>
                        {doc.expiresAt && (
                          <p className="text-xs text-gray-400">Expire le {formatDate(doc.expiresAt)}</p>
                        )}
                        {doc.adminNote && (
                          <p className="text-xs text-amber-600 mt-0.5 italic">Note : {doc.adminNote}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                        <BadgeIcon className="w-3 h-3" />{badge.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setPreviewDoc(doc)} className="text-gray-400 hover:text-primary-600 transition-colors" title="Aperçu">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownload(doc.id, doc.originalName, doc.mimeType)} className="text-gray-400 hover:text-primary-600 transition-colors" title="Télécharger">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Per-document validation controls */}
                    {doc.status !== 'VALIDATED' && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-gray-50">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Note admin (optionnelle)"
                            value={docNotes[doc.id] || ''}
                            onChange={(e) => setDocNotes((n) => ({ ...n, [doc.id]: e.target.value }))}
                            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
                          />
                          <input
                            type="date"
                            title="Date d'expiration (optionnelle)"
                            value={docExpiries[doc.id] || ''}
                            onChange={(e) => setDocExpiries((ex) => ({ ...ex, [doc.id]: e.target.value }))}
                            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={docProcessing[doc.id]}
                            onClick={() => handleDocStatus(doc.id, 'VALIDATED')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />Valider
                          </button>
                          <button
                            disabled={docProcessing[doc.id]}
                            onClick={() => handleDocStatus(doc.id, 'REJECTED')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />Refuser
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Note (optionnelle, visible par l'utilisateur en cas de refus)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Motif de refus ou commentaire..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleDecision('VERIFIED')}
              loading={processing}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approuver
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDecision('REJECTED')}
              loading={processing}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Refuser
            </Button>
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

  useEffect(fetchData, []);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
            Vérifications en attente
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {users.length} compte{users.length !== 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="font-medium text-gray-500">Aucune vérification en attente</p>
            <p className="text-sm text-gray-400 mt-1">Tous les comptes ont été traités</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-3">
            {users.map((u) => (
              <UserCard key={u.id} user={u} onDecision={handleDecision} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
