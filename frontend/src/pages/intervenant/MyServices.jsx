import { useState, useEffect } from 'react';
import { coachServiceApi } from '../../services/coachService.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Plus, Pencil, X, Clock, Zap, Leaf, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORY_LABELS } from '../../utils/constants';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const CATEGORY_ICONS = {
  SPORT: Zap,
  NUTRITION: Leaf,
  MENTAL: Heart,
  BIENETRE: Heart,
};

const SESSION_TYPE_OPTIONS = [
  { value: 'SOLO', label: 'Individuel' },
  { value: 'DUO', label: 'Duo (2 pers.)' },
  { value: 'GROUP', label: 'Collectif' },
];

const EMPTY_SERVICE_FORM = {
  name: '',
  description: '',
  durationMinutes: 60,
  price: '',
  category: 'SPORT',
  sessionType: 'SOLO',
  maxParticipants: '',
};

export default function MyServices() {
  const [loading, setLoading] = useState(true);
  const [coachServices, setCoachServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [savingService, setSavingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ ...EMPTY_SERVICE_FORM });

  const loadCoachServices = () => {
    coachServiceApi
      .getMine()
      .then(({ data }) => setCoachServices(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoachServices();
  }, []);

  const openAddServiceForm = () => {
    setEditingServiceId(null);
    setServiceForm({ ...EMPTY_SERVICE_FORM });
    setShowServiceForm(true);
  };

  const openEditServiceForm = (svc) => {
    setEditingServiceId(svc.id);
    setServiceForm({
      name: svc.name,
      description: svc.description || '',
      durationMinutes: svc.durationMinutes,
      price: Number(svc.price),
      category: svc.category,
      sessionType: svc.sessionType || 'SOLO',
      maxParticipants: svc.maxParticipants ?? '',
    });
    setShowServiceForm(true);
  };

  const cancelServiceForm = () => {
    setShowServiceForm(false);
    setEditingServiceId(null);
    setServiceForm({ ...EMPTY_SERVICE_FORM });
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim() || !serviceForm.price) {
      toast.error('Nom et prix sont requis');
      return;
    }
    setSavingService(true);
    try {
      const payload = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        durationMinutes: serviceForm.durationMinutes,
        price: parseFloat(serviceForm.price),
        category: serviceForm.category,
        sessionType: serviceForm.sessionType,
        maxParticipants: serviceForm.sessionType !== 'SOLO' && serviceForm.maxParticipants !== ''
          ? parseInt(serviceForm.maxParticipants, 10)
          : null,
      };
      if (editingServiceId) {
        await coachServiceApi.update(editingServiceId, payload);
        toast.success('Service mis a jour');
      } else {
        await coachServiceApi.create(payload);
        toast.success('Service cree');
      }
      cancelServiceForm();
      loadCoachServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id) => {
    try {
      await coachServiceApi.remove(id);
      toast.success('Service desactive');
      loadCoachServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mes services</h1>
        <p className="text-gray-500 mt-1">Créez et gérez les prestations que vos clients peuvent réserver</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Mes services</h2>
          {!showServiceForm && (
            <button
              type="button"
              onClick={openAddServiceForm}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un service
            </button>
          )}
        </div>

        {/* Inline add/edit form */}
        {showServiceForm && (
          <div className="mb-5 p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nom du service"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="Coaching sportif"
              />
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Catégorie</label>
                <select
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Décrivez votre service..."
                rows={2}
                maxLength={300}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Durée</label>
                <select
                  value={serviceForm.durationMinutes}
                  onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) })}
                  className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
              <Input
                label="Prix (€)"
                type="number"
                min={0}
                step={0.01}
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                placeholder="50"
              />
            </div>
            {/* Type de session */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Type de session</label>
              <div className="flex gap-2">
                {SESSION_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setServiceForm({ ...serviceForm, sessionType: opt.value, ...(opt.value === 'SOLO' ? { maxParticipants: '' } : {}) })}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      serviceForm.sessionType === opt.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {serviceForm.sessionType !== 'SOLO' && (
              <Input
                label="Nombre max de participants"
                type="number"
                min={2}
                max={50}
                value={serviceForm.maxParticipants}
                onChange={(e) => setServiceForm({ ...serviceForm, maxParticipants: e.target.value })}
                placeholder="10"
              />
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={handleSaveService} loading={savingService} size="sm">
                {editingServiceId ? 'Mettre à jour' : 'Créer le service'}
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelServiceForm}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Services grid */}
        {coachServices.length === 0 && !showServiceForm ? (
          <p className="text-sm text-gray-400">Aucun service configuré pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coachServices.map((svc) => {
              const Icon = CATEGORY_ICONS[svc.category] || Zap;
              const badgeColors = {
                SPORT: 'bg-primary-50 text-primary-700',
                NUTRITION: 'bg-green-50 text-green-700',
                MENTAL: 'bg-purple-50 text-purple-700',
                BIENETRE: 'bg-orange-50 text-orange-700',
              };
              const colorClass = badgeColors[svc.category] || 'bg-gray-50 text-gray-700';
              return (
                <div
                  key={svc.id}
                  className={`relative p-4 rounded-xl border transition-colors ${svc.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                      <Icon className="w-3 h-3" />
                      {CATEGORY_LABELS[svc.category] || svc.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditServiceForm(svc)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {svc.active && (
                        <button
                          type="button"
                          onClick={() => handleDeleteService(svc.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Désactiver"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {svc.durationMinutes} min
                    </span>
                    <span className="font-semibold text-gray-900">{Number(svc.price).toFixed(2)} €</span>
                    {svc.sessionType && svc.sessionType !== 'SOLO' && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {svc.sessionType === 'DUO' ? 'Duo' : `Collectif${svc.maxParticipants ? ` (${svc.maxParticipants} max)` : ''}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
