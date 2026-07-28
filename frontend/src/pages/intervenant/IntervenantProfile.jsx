import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import Spinner from '../../components/ui/Spinner';
import { Camera, X, ImagePlus } from 'lucide-react';
import AvatarFallback from '../../components/ui/AvatarFallback';
import toast from 'react-hot-toast';
import DeleteAccountSection from '../../components/profile/DeleteAccountSection';
import PasskeyManager from '../../components/PasskeyManager';
import UploadDocuments from '../shared/UploadDocuments';
import { COURSE_LOCATION_OPTIONS } from '../../utils/constants';

const IP_CSS = `
  .ip-identity{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .ip-avatar-wrap{position:relative;flex-shrink:0}
  .ip-avatar-btn{position:absolute;bottom:-2px;right:-2px;width:28px;height:28px;border-radius:50%;background:var(--orange);border:2px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;padding:0}
  .ip-avatar-btn:disabled{opacity:.6;cursor:not-allowed}
  .ip-identity-name{font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ink);margin:0}
  .ip-identity-mail{font-size:13px;color:var(--ink-3);margin:3px 0 0}
  .ip-identity-role{font-size:12.5px;font-weight:600;color:var(--orange);margin:5px 0 0}
  .ip-form{display:flex;flex-direction:column;gap:18px}
  .ip-tag-row{display:flex;gap:8px}
  .ip-tag-row .dsh-input{flex:1}
  .ip-tag{display:inline-flex;align-items:center;gap:7px;background:var(--orange-soft);color:var(--orange);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600}
  .ip-tag--neutral{background:#F2F1ED;color:var(--ink-2)}
  .ip-tag button{background:none;border:none;cursor:pointer;color:inherit;display:flex;padding:0;opacity:.7}
  .ip-tag button:hover{opacity:1}
  .ip-count{font-size:12px;color:var(--ink-3);text-align:right;margin:6px 0 0}

  .ip-gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}
  @media(max-width:900px){.ip-gallery{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:560px){.ip-gallery{grid-template-columns:repeat(2,1fr)}}
  .ip-photo{position:relative;aspect-ratio:1/1;border-radius:14px;overflow:hidden;background:#F2F1ED;border:1px solid var(--line)}
  .ip-photo img{width:100%;height:100%;object-fit:cover}
  .ip-photo-del{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(15,15,15,.6);color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .2s,background .2s}
  .ip-photo:hover .ip-photo-del{opacity:1}
  .ip-photo-del:hover{background:#C0392B}

  .ip-check{display:flex;align-items:flex-start;gap:11px}
  .ip-check input{margin-top:3px;width:16px;height:16px;accent-color:var(--orange);flex-shrink:0}
  .ip-check label{font-size:13.5px;font-weight:600;color:var(--ink);cursor:pointer}
  @keyframes ip-spin{to{transform:rotate(360deg)}}
`;

export default function IntervenantProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const { hash } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [diplomaInput, setDiplomaInput] = useState('');

  // Galerie photos (séances, matériel, lieux…)
  const [photos, setPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const galleryInputRef = useRef(null);

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

  // Défilement vers la section documents quand on arrive avec #documents
  useEffect(() => {
    if (loading || hash !== '#documents') return;
    const el = document.getElementById('documents');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, hash]);

  useEffect(() => {
    if (!authUser?.id) return;
    userApi
      .getPhotos(authUser.id)
      .then(({ data }) => setPhotos(data))
      .catch(() => {});
  }, [authUser?.id]);

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('photo', file);
        const { data } = await userApi.uploadPhoto(fd);
        setPhotos((prev) => [...prev, data]);
      }
      toast.success(files.length > 1 ? `${files.length} photos ajoutées` : 'Photo ajoutée');
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'upload");
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await userApi.deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Photo supprimée');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
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
    <div className="dsh-page" style={{ maxWidth: 860 }}>
      <style>{IP_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mon profil</h1>
          <p className="dsh-sub">Gérez votre profil professionnel et votre expertise</p>
        </div>
      </div>

      {/* Avatar & identité */}
      <div className="dsh-card">
        <div className="ip-identity">
          <div className="ip-avatar-wrap">
            <AvatarFallback
              user={{
                firstName: form.firstName,
                lastName: form.lastName,
                avatarUrl,
                gender: form.gender,
              }}
              size="lg"
              title={`${form.firstName || ''} ${form.lastName || ''}`.trim() || 'Avatar'}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="ip-avatar-btn"
              title="Changer la photo"
            >
              {avatarUploading ? (
                <span style={{ width: 12, height: 12, border: '1.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'ip-spin .8s linear infinite' }} />
              ) : (
                <Camera size={13} />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="ip-identity-name">{form.firstName} {form.lastName}</p>
            <p className="ip-identity-mail">{authUser?.email}</p>
            <p className="ip-identity-role">Coach professionnel</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="dsh-page">
        {/* Informations */}
        <div className="dsh-card">
          <div className="ip-form">
            <h2 className="dsh-card-title">Informations</h2>

            <div className="dsh-row">
              <div>
                <label className="dsh-label" htmlFor="firstName">Prénom</label>
                <input id="firstName" className="dsh-input" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
              </div>
              <div>
                <label className="dsh-label" htmlFor="lastName">Nom</label>
                <input id="lastName" className="dsh-input" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="dsh-label" htmlFor="phone">Téléphone</label>
              <input id="phone" className="dsh-input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+33 6 xx xx xx xx" />
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
              <input id="city" className="dsh-input" value={form.profile.city} onChange={(e) => setProfileField('city', e.target.value)} placeholder="Paris" />
            </div>
          </div>
        </div>

        {/* Présentation */}
        <div className="dsh-card">
          <div className="ip-form">
            <h2 className="dsh-card-title">Présentation</h2>
            <div>
              <label className="dsh-label" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                className="dsh-textarea"
                value={form.profile.bio}
                onChange={(e) => setProfileField('bio', e.target.value)}
                placeholder="Décrivez votre parcours et votre approche..."
                rows={5}
                maxLength={500}
              />
              <p className="ip-count">{form.profile.bio.length} / 500</p>
            </div>
          </div>
        </div>

        {/* Expérience */}
        <div className="dsh-card">
          <div className="ip-form">
            <h2 className="dsh-card-title">Expérience</h2>
            <div>
              <label className="dsh-label" htmlFor="experience">Années d'expérience</label>
              <input
                id="experience"
                className="dsh-input"
                type="number"
                min={0}
                value={form.profile.experience}
                onChange={(e) => setProfileField('experience', e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
        </div>

        {/* Spécialités */}
        <div className="dsh-card">
          <div className="ip-form">
            <div>
              <h2 className="dsh-card-title">Spécialités</h2>
              <p className="dsh-card-sub">Les disciplines que vous pratiquez et enseignez.</p>
            </div>
            <div>
              <div className="ip-tag-row">
                <input
                  type="text"
                  className="dsh-input"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(), addTag('specialties', specialtyInput, setSpecialtyInput))
                  }
                  placeholder="Musculation, Yoga, Running..."
                />
                <button
                  type="button"
                  onClick={() => addTag('specialties', specialtyInput, setSpecialtyInput)}
                  className="dsh-btn dsh-btn--orange"
                >
                  Ajouter
                </button>
              </div>
              {form.profile.specialties.length > 0 && (
                <div className="dsh-chips" style={{ marginTop: 12 }}>
                  {form.profile.specialties.map((s, i) => (
                    <span key={i} className="ip-tag">
                      {s}
                      <button type="button" onClick={() => removeTag('specialties', i)} aria-label={`Retirer ${s}`}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diplômes & certifications */}
        <div className="dsh-card">
          <div className="ip-form">
            <div>
              <h2 className="dsh-card-title">Diplômes &amp; certifications</h2>
              <p className="dsh-card-sub">Vos diplômes et qualifications professionnelles.</p>
            </div>
            <div>
              <div className="ip-tag-row">
                <input
                  type="text"
                  className="dsh-input"
                  value={diplomaInput}
                  onChange={(e) => setDiplomaInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(), addTag('diplomas', diplomaInput, setDiplomaInput))
                  }
                  placeholder="BPJEPS, Master STAPS, CQP..."
                />
                <button
                  type="button"
                  onClick={() => addTag('diplomas', diplomaInput, setDiplomaInput)}
                  className="dsh-btn dsh-btn--orange"
                >
                  Ajouter
                </button>
              </div>
              {form.profile.diplomas.length > 0 && (
                <div className="dsh-chips" style={{ marginTop: 12 }}>
                  {form.profile.diplomas.map((d, i) => (
                    <span key={i} className="ip-tag ip-tag--neutral">
                      {d}
                      <button type="button" onClick={() => removeTag('diplomas', i)} aria-label={`Retirer ${d}`}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Galerie photos */}
        <div className="dsh-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 className="dsh-card-title">Galerie photos</h2>
              <p className="dsh-card-sub" style={{ maxWidth: 480, lineHeight: 1.5 }}>
                Montrez vos séances, votre matériel, vos lieux d'entraînement — visible sur votre profil public ({photos.length}/12).
              </p>
            </div>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={photoUploading || photos.length >= 12}
              className="dsh-btn dsh-btn--orange dsh-btn--sm"
            >
              <ImagePlus size={14} />
              {photoUploading ? 'Envoi…' : 'Ajouter des photos'}
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={handleAddPhotos}
            />
          </div>

          {photos.length === 0 ? (
            <p className="dsh-card-sub" style={{ marginTop: 14, fontStyle: 'italic' }}>
              Aucune photo pour le moment. JPG, PNG ou WebP, 5 Mo max par photo.
            </p>
          ) : (
            <div className="ip-gallery">
              {photos.map((photo) => (
                <div key={photo.id} className="ip-photo">
                  <img src={photo.url} alt="Photo de la galerie" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="ip-photo-del"
                    title="Supprimer cette photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Caractéristiques & séance type */}
        <div className="dsh-card">
          <div className="ip-form">
            <h2 className="dsh-card-title">Caractéristiques &amp; séance type</h2>

            <div>
              <span className="dsh-label">Lieu du cours</span>
              <div className="dsh-chips">
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
                      className={`dsh-chip${selected ? ' is-active' : ''}`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="dsh-label" htmlFor="typicalSession">
                Décrivez le déroulement d'une séance typique
              </label>
              <textarea
                id="typicalSession"
                className="dsh-textarea"
                value={form.profile.typicalSession}
                onChange={(e) => setProfileField('typicalSession', e.target.value)}
                placeholder="Ex : Échauffement 10min → travail technique 30min → cardio 15min → étirements 5min"
                rows={4}
                maxLength={800}
              />
              <p className="ip-count">{form.profile.typicalSession.length} / 800</p>
            </div>

            <div className="ip-check">
              <input
                type="checkbox"
                id="serviceAgreement"
                checked={form.profile.serviceAgreement}
                onChange={(e) => setProfileField('serviceAgreement', e.target.checked)}
              />
              <div>
                <label htmlFor="serviceAgreement">Agréé service à la personne</label>
                <p className="dsh-card-sub">
                  Permet aux clients de bénéficier d'une réduction d'impôt de 50 %
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="dsh-btn dsh-btn--orange" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </form>

      {/* Documents (vérification du compte) */}
      <div id="documents" style={{ scrollMarginTop: 90 }}>
        <UploadDocuments />
      </div>

      {/* Sécurité */}
      <PasskeyManager />

      <DeleteAccountSection />
    </div>
  );
}
