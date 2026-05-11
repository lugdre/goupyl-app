import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { documentApi } from '../../services/document.api';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Upload, FileText, Trash2, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

const DOC_TYPES = [
  { value: 'ID_CARD', label: "Pièce d'identité", desc: "Carte nationale d'identité ou passeport", required: true },
  { value: 'DIPLOMA', label: 'Diplôme / Certification', desc: 'Diplôme ou certification professionnelle', required: false },
  { value: 'OTHER', label: 'Autre document', desc: 'Tout autre justificatif utile', required: false },
];

const TYPE_LABELS = { ID_CARD: "Pièce d'identité", DIPLOMA: 'Diplôme', OTHER: 'Autre' };

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

  const handleFileSelect = (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles(prev => ({ ...prev, [type]: file }));
    e.target.value = '';
  };

  const handleRemovePending = (type) => {
    setPendingFiles(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const handleSubmit = async () => {
    const typesToUpload = Object.keys(pendingFiles);
    if (typesToUpload.length === 0) return;

    setUploading(true);
    let hasError = false;
    let successfulTypes = [];
    for (const type of typesToUpload) {
      try {
        await documentApi.upload(type, pendingFiles[type]);
        successfulTypes.push(type);
      } catch (err) {
        hasError = true;
        toast.error(`Erreur (${TYPE_LABELS[type]}) : ${err.response?.data?.message || 'Erreur lors de l\'envoi'}`);
      }
    }

    if (!hasError) {
      toast.success('Documents envoyés avec succès');
    }

    setPendingFiles(prev => {
      const next = { ...prev };
      successfulTypes.forEach(t => delete next[t]);
      return next;
    });

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Banner verification rejected */}
      {user?.verificationStatus === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <ShieldCheck className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Vérification refusée</p>
            <p className="text-sm text-red-700 mt-1">
              Vos documents n'ont pas pu être validés pour la raison suivante :
              <br/>
              <span className="font-medium">"{user.verificationNote || 'Documents non conformes'}"</span>
            </p>
            <p className="text-sm text-red-700 mt-2 font-medium">
              Veuillez renvoyer vos documents pour soumettre une nouvelle demande.
            </p>
          </div>
        </div>
      )}

      {/* Banner verification pending */}
      {user?.verificationStatus === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Compte en attente de vérification</p>
            <p className="text-sm text-amber-700 mt-1">
              Votre compte sera activé après vérification de vos documents par notre équipe (généralement sous 24h).
              Vous pouvez accéder à votre tableau de bord en attendant.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary-600" />
          Vérification de votre compte
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Déposez vos documents pour accélérer la validation de votre profil.
          {user?.role === 'INTERVENANT' && ' Une pièce d\'identité est obligatoire.'}
        </p>
      </div>

      {/* Document types */}
      <div className="space-y-4 mb-8">
        {DOC_TYPES.map(({ value, label, desc, required }) => {
          const existing = documents.filter((d) => d.type === value);
          return (
            <div key={value} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                    {label}
                    {required && <span className="text-xs text-red-500 font-normal">* obligatoire</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors shrink-0 ${
                  uploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}>
                  <Upload className="w-4 h-4" />
                  Ajouter
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading}
                    onChange={(e) => handleFileSelect(value, e)}
                  />
                </label>
              </div>

              {pendingFiles[value] && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-800 truncate">{pendingFiles[value].name}</p>
                      <p className="text-xs text-blue-500">{formatSize(pendingFiles[value].size)} (en attente d'envoi)</p>
                    </div>
                    <button
                      onClick={() => handleRemovePending(value)}
                      disabled={uploading}
                      className="text-blue-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {existing.length > 0 && (
                <div className="space-y-2">
                  {existing.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{doc.originalName}</p>
                        <p className="text-xs text-gray-400">{formatSize(doc.sizeBytes)}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id || uploading}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        {deleting === doc.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existing.length === 0 && !pendingFiles[value] && (
                <p className="text-xs text-gray-400 italic">Aucun document envoyé — PDF, JPG ou PNG, max 5 Mo</p>
              )}
            </div>
          );
        })}
      </div>

      {loadingDocs && (
        <div className="flex justify-center py-4"><Spinner /></div>
      )}

      {/* Submit Button */}
      {Object.keys(pendingFiles).length > 0 && (
        <div className="mb-6">
          <Button
            onClick={handleSubmit}
            loading={uploading}
            className="w-full text-base py-3"
            variant="primary"
          >
            Envoyer les {Object.keys(pendingFiles).length} document(s) sélectionné(s)
          </Button>
        </div>
      )}

      {/* Summary + CTA */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center gap-3 ${hasIdCard ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
        <CheckCircle className={`w-5 h-5 shrink-0 ${hasIdCard ? 'text-green-500' : 'text-gray-400'}`} />
        <p className={`text-sm font-medium ${hasIdCard ? 'text-green-800' : 'text-gray-500'}`}>
          {hasIdCard
            ? `${documents.length} document${documents.length > 1 ? 's' : ''} envoyé${documents.length > 1 ? 's' : ''} — votre dossier est complet`
            : 'Envoyez au minimum votre pièce d\'identité'}
        </p>
      </div>

      <Button
        onClick={() => navigate(dashPath)}
        className="w-full"
        variant={hasIdCard ? 'primary' : 'outline'}
      >
        {hasIdCard ? 'Accéder à mon tableau de bord' : 'Passer cette étape pour l\'instant'}
      </Button>
    </div>
  );
}
