import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import DeleteAccountSection from '../../components/profile/DeleteAccountSection';
import PasskeyManager from '../../components/PasskeyManager';
import { useTheme } from '../../context/ThemeContext';
import ThemeSelector from '../../components/ThemeSelector';
import { Camera } from 'lucide-react';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';

const LEVELS = [
  { value: 'DEBUTANT', label: 'Débutant' },
  { value: 'INTERMEDIAIRE', label: 'Intermédiaire' },
  { value: 'AVANCE', label: 'Avancé' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ELITE', label: 'Élite' },
];

// Niveaux avec accompagnement sur-mesure : besoin spécifique (texte libre) au lieu d'objectifs
const SPECIFIC_NEED_LEVELS = ['PRO', 'ELITE'];

const THEME_MODE_HINT = {
  light: 'Toujours en mode clair',
  dark: 'Toujours en mode sombre',
  system: 'Suit le thème de votre appareil',
};

export default function ClientProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const { mode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    profile: {
      city: '',
      level: 'DEBUTANT',
      sportType: '',
      constraints: '',
      objectives: [],
      specificNeed: '',
    },
  });

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
            level: data.profile?.level || 'DEBUTANT',
            sportType: data.profile?.sportType || '',
            constraints: data.profile?.constraints || '',
            objectives: data.profile?.objectives || [],
            specificNeed: data.profile?.specificNeed || '',
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setProfileField = (key, value) =>
    setForm((prev) => ({ ...prev, profile: { ...prev.profile, [key]: value } }));

  const addObjective = () => {
    const trimmed = objectiveInput.trim();
    if (!trimmed) return;
    setProfileField('objectives', [...form.profile.objectives, trimmed]);
    setObjectiveInput('');
  };

  const removeObjective = (index) => {
    setProfileField(
      'objectives',
      form.profile.objectives.filter((_, i) => i !== index)
    );
  };

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
      toast.error(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.updateMe(form);
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
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles et sportives</p>
      </div>

      {/* Avatar & identity */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={avatarUrl || (form.gender === 'FEMME' ? avatarFemale : avatarMale)}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => {
                // URL d'avatar morte (ancien stockage disque) → avatar par défaut
                e.currentTarget.onerror = null;
                e.currentTarget.src = form.gender === 'FEMME' ? avatarFemale : avatarMale;
              }}
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
          </div>
        </div>
      </Card>

      {/* Informations personnelles */}
      <Card>
        <form onSubmit={handleSave} className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>
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

          <hr className="border-gray-100" />

          <h2 className="text-base font-semibold text-gray-900">Profil sportif</h2>

          {/* Level select */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-900">Niveau</label>
            <select
              value={form.profile.level}
              onChange={(e) => setProfileField('level', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Sport pratiqué"
            value={form.profile.sportType}
            onChange={(e) => setProfileField('sportType', e.target.value)}
            placeholder="Football, Tennis, Natation..."
          />

          {/* Constraints textarea */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-900">Contraintes physiques</label>
            <textarea
              value={form.profile.constraints}
              onChange={(e) => setProfileField('constraints', e.target.value)}
              placeholder="Blessures, limitations physiques..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
          </div>

          {/* Besoin spécifique (PRO / ELITE) — sinon objectifs */}
          {SPECIFIC_NEED_LEVELS.includes(form.profile.level) ? (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-900">Besoin spécifique</label>
              <textarea
                value={form.profile.specificNeed}
                onChange={(e) => setProfileField('specificNeed', e.target.value)}
                placeholder="Décrivez précisément votre objectif de performance, votre discipline, vos échéances de compétition, vos contraintes…"
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <p className="text-xs text-gray-500">Réservé aux niveaux Pro et Élite — un accompagnement sur-mesure.</p>
            </div>
          ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Objectifs</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                placeholder="Perte de poids, endurance..."
                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                type="button"
                onClick={addObjective}
                className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
            {form.profile.objectives.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.profile.objectives.map((obj, i) => (
                  <span
                    key={i}
                    className="bg-primary-100 text-primary-700 rounded-full px-3 py-1 text-sm flex items-center gap-1.5"
                  >
                    {obj}
                    <button
                      type="button"
                      onClick={() => removeObjective(i)}
                      className="hover:text-primary-900 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          )}

          <div className="pt-2">
            <Button type="submit" loading={saving}>
              Sauvegarder
            </Button>
          </div>
        </form>
      </Card>
      
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Sécurité</h2>
        <PasskeyManager />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Préférences</h2>
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-gray-900">Thème de l'interface</p>
              <p className="text-xs text-gray-500">{THEME_MODE_HINT[mode]}</p>
            </div>
            <ThemeSelector />
          </div>
        </Card>
      </div>

      <DeleteAccountSection />
    </div>
  );
}
