import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import DeleteAccountSection from '../../components/profile/DeleteAccountSection';
import PasskeyManager from '../../components/PasskeyManager';
import { Camera, X } from 'lucide-react';
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

const CP_CSS = `
  .cp-identity{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .cp-avatar-wrap{position:relative;flex-shrink:0}
  .cp-avatar{width:76px;height:76px;border-radius:50%;object-fit:cover;border:1px solid var(--line);background:#F2F1ED}
  .cp-avatar-btn{position:absolute;bottom:-2px;right:-2px;width:28px;height:28px;border-radius:50%;background:var(--orange);border:2px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;padding:0}
  .cp-avatar-btn:disabled{opacity:.6;cursor:not-allowed}
  .cp-identity-name{font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ink);margin:0}
  .cp-identity-mail{font-size:13px;color:var(--ink-3);margin:3px 0 0}
  .cp-form{display:flex;flex-direction:column;gap:18px}
  .cp-obj-row{display:flex;gap:8px}
  .cp-obj-row .dsh-input{flex:1}
  .cp-tag{display:inline-flex;align-items:center;gap:7px;background:var(--orange-soft);color:var(--orange);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600}
  .cp-tag button{background:none;border:none;cursor:pointer;color:inherit;display:flex;padding:0;opacity:.7}
  .cp-tag button:hover{opacity:1}
  @keyframes cp-spin{to{transform:rotate(360deg)}}
`;

export default function ClientProfile() {
  const { user: authUser, refreshUser } = useAuth();
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
    <div className="dsh-page" style={{ maxWidth: 760 }}>
      <style>{CP_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mon profil</h1>
          <p className="dsh-sub">Gérez vos informations personnelles et sportives</p>
        </div>
      </div>

      {/* Avatar & identité */}
      <div className="dsh-card">
        <div className="cp-identity">
          <div className="cp-avatar-wrap">
            <img
              src={avatarUrl || (form.gender === 'FEMME' ? avatarFemale : avatarMale)}
              alt="Avatar"
              className="cp-avatar"
              onError={(e) => {
                // URL d'avatar morte (ancien stockage disque) → avatar par défaut
                e.currentTarget.onerror = null;
                e.currentTarget.src = form.gender === 'FEMME' ? avatarFemale : avatarMale;
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="cp-avatar-btn"
              title="Changer la photo"
            >
              {avatarUploading ? (
                <span style={{ width: 12, height: 12, border: '1.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'cp-spin .8s linear infinite' }} />
              ) : (
                <Camera size={13} />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="cp-identity-name">{form.firstName} {form.lastName}</p>
            <p className="cp-identity-mail">{authUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Informations personnelles + profil sportif */}
      <div className="dsh-card">
        <form onSubmit={handleSave} className="cp-form">
          <h2 className="dsh-card-title">Informations personnelles</h2>

          <div className="dsh-row">
            <div>
              <label className="dsh-label" htmlFor="firstName">Prénom</label>
              <input
                id="firstName"
                className="dsh-input"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
              />
            </div>
            <div>
              <label className="dsh-label" htmlFor="lastName">Nom</label>
              <input
                id="lastName"
                className="dsh-input"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="dsh-label" htmlFor="phone">Téléphone</label>
            <input
              id="phone"
              className="dsh-input"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+33 6 xx xx xx xx"
            />
          </div>

          <div>
            <span className="dsh-label">Genre</span>
            <div className="dsh-chips">
              {[{ value: 'HOMME', label: 'Homme' }, { value: 'FEMME', label: 'Femme' }].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField('gender', form.gender === value ? null : value)}
                  className={`dsh-chip${form.gender === value ? ' is-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="dsh-label" htmlFor="city">Ville</label>
            <input
              id="city"
              className="dsh-input"
              value={form.profile.city}
              onChange={(e) => setProfileField('city', e.target.value)}
              placeholder="Paris"
            />
          </div>

          <hr className="dsh-sep" />

          <h2 className="dsh-card-title">Profil sportif</h2>

          <div>
            <label className="dsh-label" htmlFor="level">Niveau</label>
            <select
              id="level"
              className="dsh-select"
              value={form.profile.level}
              onChange={(e) => setProfileField('level', e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="dsh-label" htmlFor="sportType">Sport pratiqué</label>
            <input
              id="sportType"
              className="dsh-input"
              value={form.profile.sportType}
              onChange={(e) => setProfileField('sportType', e.target.value)}
              placeholder="Football, Tennis, Natation..."
            />
          </div>

          <div>
            <label className="dsh-label" htmlFor="constraints">Contraintes physiques</label>
            <textarea
              id="constraints"
              className="dsh-textarea"
              value={form.profile.constraints}
              onChange={(e) => setProfileField('constraints', e.target.value)}
              placeholder="Blessures, limitations physiques..."
              rows={3}
            />
          </div>

          {/* Besoin spécifique (PRO / ELITE) — sinon objectifs */}
          {SPECIFIC_NEED_LEVELS.includes(form.profile.level) ? (
            <div>
              <label className="dsh-label" htmlFor="specificNeed">Besoin spécifique</label>
              <textarea
                id="specificNeed"
                className="dsh-textarea"
                value={form.profile.specificNeed}
                onChange={(e) => setProfileField('specificNeed', e.target.value)}
                placeholder="Décrivez précisément votre objectif de performance, votre discipline, vos échéances de compétition, vos contraintes…"
                rows={4}
                maxLength={1000}
              />
              <p className="dsh-card-sub">Réservé aux niveaux Pro et Élite — un accompagnement sur-mesure.</p>
            </div>
          ) : (
            <div>
              <span className="dsh-label">Objectifs</span>
              <div className="cp-obj-row">
                <input
                  type="text"
                  className="dsh-input"
                  value={objectiveInput}
                  onChange={(e) => setObjectiveInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                  placeholder="Perte de poids, endurance..."
                />
                <button type="button" onClick={addObjective} className="dsh-btn dsh-btn--orange">
                  Ajouter
                </button>
              </div>
              {form.profile.objectives.length > 0 && (
                <div className="dsh-chips" style={{ marginTop: 12 }}>
                  {form.profile.objectives.map((obj, i) => (
                    <span key={i} className="cp-tag">
                      {obj}
                      <button type="button" onClick={() => removeObjective(i)} aria-label={`Retirer ${obj}`}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <button type="submit" className="dsh-btn dsh-btn--orange" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>

      {/* Sécurité */}
      <PasskeyManager />

      <DeleteAccountSection />
    </div>
  );
}
