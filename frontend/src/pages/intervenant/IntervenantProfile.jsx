import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import { coachServiceApi } from '../../services/coachService.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { Plus, Pencil, X, Clock, Zap, Leaf, Heart, Moon, Sun, Camera } from 'lucide-react';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';
import toast from 'react-hot-toast';
import DeleteAccountSection from '../../components/profile/DeleteAccountSection';
import PasskeyManager from '../../components/PasskeyManager';
import { CATEGORY_LABELS } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const COURSE_LOCATION_OPTIONS = ['A domicile', 'En salle', 'A l\'exterieur', 'En entreprise'];

const CATEGORY_ICONS = {
  SPORT: Zap,
  NUTRITION: Leaf,
  MENTAL: Heart,
  BIENETRE: Heart,
};

const CATEGORY_COLORS = {
  SPORT: 'text-blue-600',
  NUTRITION: 'text-green-600',
  MENTAL: 'text-purple-600',
  BIENETRE: 'text-orange-500',
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


export default function IntervenantProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const { isDark, toggle } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [diplomaInput, setDiplomaInput] = useState('');

  // Coach services state
  const [coachServices, setCoachServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [savingService, setSavingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ ...EMPTY_SERVICE_FORM });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    profile: {
      city: '',
      bio: '',
      experience: '',
      level: 'DEBUTANT',
      hourlyRate: '',
      specialties: [],
      diplomas: [],
      courseLocations: [],
      typicalSession: '',
      serviceAgreement: false,
    },
  });

  const loadCoachServices = () => {
    coachServiceApi.getMine().then(({ data }) => setCoachServices(data)).catch(() => {});
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

  useEffect(() => {
    userApi
      .getMe()
      .then(({ data }) => {
        setAvatarUrl(data.avatarUrl || null);
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          gender: data.gender || null,
          profile: {
            city: data.profile?.city || '',
            bio: data.profile?.bio || '',
            experience: data.profile?.experience ?? '',
            level: data.profile?.level || 'DEBUTANT',
            hourlyRate: data.profile?.hourlyRate ?? '',
            specialties: data.profile?.specialties || [],
            diplomas: data.profile?.diplomas || [],
            courseLocations: data.profile?.courseLocations || [],
            typicalSession: data.profile?.typicalSession || '',
            serviceAgreement: data.profile?.serviceAgreement ?? false,
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await userApi.uploadAvatar(fd);
      setAvatarUrl(data.avatarUrl);
      await refreshUser();
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'upload");
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setProfileField = (key, value) =>
    setForm((prev) => ({ ...prev, profile: { ...prev.profile, [key]: value } }));

  const addTag = (field, value, setter) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setProfileField(field, [...form.profile[field], trimmed]);
    setter('');
  };

  const removeTag = (field, index) => {
    setProfileField(
      field,
      form.profile[field].filter((_, i) => i !== index)
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        profile: {
          ...form.profile,
          experience: form.profile.experience !== '' ? parseInt(form.profile.experience, 10) : undefined,
          hourlyRate: form.profile.hourlyRate !== '' ? parseFloat(form.profile.hourlyRate) : undefined,
        },
      };
      await userApi.updateMe(payload);
      toast.success('Profil mis à jour avec succès');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1">Gérez votre profil professionnel et votre expertise</p>
      </div>

      {/* Avatar & identity */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={avatarUrl || (form.gender === 'FEMME' ? avatarFemale : avatarMale)}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 hover:bg-primary-500 rounded-full flex items-center justify-center shadow transition-colors"
              title="Changer la photo"
            >
              {avatarUploading ? (
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3 text-white" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-gray-500">{authUser?.email}</p>
            <p className="text-sm text-primary-600 font-medium mt-0.5">Coach professionnel</p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Informations */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Informations</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
              />
              <Input
                label="Nom"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
              />
            </div>
            <Input
              label="Téléphone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+33 6 xx xx xx xx"
            />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Genre</label>
              <div className="flex gap-2">
                {[{ value: 'HOMME', label: 'Homme' }, { value: 'FEMME', label: 'Femme' }].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField('gender', form.gender === value ? null : value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.gender === value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Ville"
              value={form.profile.city}
              onChange={(e) => setProfileField('city', e.target.value)}
              placeholder="Paris"
            />
          </div>
        </Card>

        {/* Présentation */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Présentation</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-900">Bio</label>
            <textarea
              value={form.profile.bio}
              onChange={(e) => setProfileField('bio', e.target.value)}
              placeholder="Décrivez votre parcours et votre approche..."
              rows={5}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {form.profile.bio.length} / 500
            </p>
          </div>
        </Card>

        {/* Expérience */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Expérience</h2>
          <Input
            label="Années d'expérience"
            type="number"
            min={0}
            value={form.profile.experience}
            onChange={(e) => setProfileField('experience', e.target.value)}
            placeholder="5"
          />
        </Card>

        {/* Spécialités */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Spécialités</h2>
          <p className="text-sm text-gray-500 mb-4">Les disciplines que vous pratiquez et enseignez.</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), addTag('specialties', specialtyInput, setSpecialtyInput))
                }
                placeholder="Musculation, Yoga, Running..."
                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                type="button"
                onClick={() => addTag('specialties', specialtyInput, setSpecialtyInput)}
                className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
            {form.profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.profile.specialties.map((s, i) => (
                  <span
                    key={i}
                    className="bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-3 py-1 text-sm flex items-center gap-1.5"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeTag('specialties', i)}
                      className="hover:text-primary-900 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Diplômes & certifications */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Diplômes & certifications</h2>
          <p className="text-sm text-gray-500 mb-4">Vos diplômes et qualifications professionnelles.</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={diplomaInput}
                onChange={(e) => setDiplomaInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), addTag('diplomas', diplomaInput, setDiplomaInput))
                }
                placeholder="BPJEPS, Master STAPS, CQP..."
                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                type="button"
                onClick={() => addTag('diplomas', diplomaInput, setDiplomaInput)}
                className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
            {form.profile.diplomas.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.profile.diplomas.map((d, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm flex items-center gap-1.5"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeTag('diplomas', i)}
                      className="hover:text-gray-900 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Caracteristiques & seance type */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Caracteristiques & seance type</h2>
          <div className="space-y-4">
            {/* Lieu du cours */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Lieu du cours</label>
              <div className="flex flex-wrap gap-2">
                {COURSE_LOCATION_OPTIONS.map((loc) => {
                  const selected = form.profile.courseLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setProfileField(
                          'courseLocations',
                          selected
                            ? form.profile.courseLocations.filter((l) => l !== loc)
                            : [...form.profile.courseLocations, loc]
                        );
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ma seance type */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-900">Decrivez le deroulement d'une seance typique</label>
              <textarea
                value={form.profile.typicalSession}
                onChange={(e) => setProfileField('typicalSession', e.target.value)}
                placeholder="Ex : Echauffement 10min → travail technique 30min → cardio 15min → etirements 5min"
                rows={4}
                maxLength={800}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <p className="text-xs text-gray-400 text-right">
                {form.profile.typicalSession.length} / 800
              </p>
            </div>

            {/* Agrement service a la personne */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="serviceAgreement"
                checked={form.profile.serviceAgreement}
                onChange={(e) => setProfileField('serviceAgreement', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <label htmlFor="serviceAgreement" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Agree service a la personne
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Permet aux clients de beneficier d'une reduction d'impot de 50%
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Button type="submit" loading={saving}>
          Sauvegarder
        </Button>
      </form>

      {/* Mes services */}
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

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Sécurité</h2>
        <PasskeyManager />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Préférences</h2>
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark
                ? <Moon className="w-5 h-5 text-primary-400" />
                : <Sun className="w-5 h-5 text-amber-400" />}
              <div>
                <p className="text-sm font-medium text-gray-900">Thème de l'interface</p>
                <p className="text-xs text-gray-500">{isDark ? 'Mode sombre activé' : 'Mode clair activé'}</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isDark ? 'bg-primary-500' : 'bg-[#D1D5DB]'}`}
              aria-label="Basculer le thème"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </Card>
      </div>

      <DeleteAccountSection />
    </div>
  );
}
