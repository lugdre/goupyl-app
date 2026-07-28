import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import Spinner from '../../components/ui/Spinner';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DeleteAccountSection from '../../components/profile/DeleteAccountSection';
import PasskeyManager from '../../components/PasskeyManager';

const EP_CSS = `
  .ep-identity{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .ep-identity-icon{width:64px;height:64px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ep-identity-name{font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ink);margin:0}
  .ep-identity-mail{font-size:13px;color:var(--ink-3);margin:3px 0 0}
  .ep-identity-role{font-size:12.5px;font-weight:600;color:var(--orange);margin:5px 0 0}
  .ep-form{display:flex;flex-direction:column;gap:18px}
`;

export default function EntrepriseProfile() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    profile: {
      city: '',
      bio: '',
    },
  });

  useEffect(() => {
    userApi
      .getMe()
      .then(({ data }) => {
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          companyName: data.companyName || '',
          profile: {
            city: data.profile?.city || '',
            bio: data.profile?.bio || '',
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setProfileField = (key, value) =>
    setForm((prev) => ({ ...prev, profile: { ...prev.profile, [key]: value } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.updateMe({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        companyName: form.companyName,
        profile: {
          city: form.profile.city,
          bio: form.profile.bio,
        },
      });
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
      <style>{EP_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Profil entreprise</h1>
          <p className="dsh-sub">Gérez les informations de votre entreprise</p>
        </div>
      </div>

      {/* Identité entreprise */}
      <div className="dsh-card">
        <div className="ep-identity">
          <div className="ep-identity-icon"><Building2 size={26} /></div>
          <div>
            <p className="ep-identity-name">
              {form.companyName || authUser?.companyName || 'Mon entreprise'}
            </p>
            <p className="ep-identity-mail">{authUser?.email}</p>
            <p className="ep-identity-role">Compte entreprise</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="dsh-page">
        {/* Informations entreprise */}
        <div className="dsh-card">
          <div className="ep-form">
            <h2 className="dsh-card-title">Informations entreprise</h2>
            <div>
              <label className="dsh-label" htmlFor="companyName">Nom de l'entreprise</label>
              <input
                id="companyName"
                className="dsh-input"
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="dsh-card">
          <div className="ep-form">
            <h2 className="dsh-card-title">Contact</h2>
            <div className="dsh-row">
              <div>
                <label className="dsh-label" htmlFor="firstName">Prénom du contact</label>
                <input
                  id="firstName"
                  className="dsh-input"
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                />
              </div>
              <div>
                <label className="dsh-label" htmlFor="lastName">Nom du contact</label>
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
              <label className="dsh-label" htmlFor="city">Ville (optionnel)</label>
              <input
                id="city"
                className="dsh-input"
                value={form.profile.city}
                onChange={(e) => setProfileField('city', e.target.value)}
                placeholder="Paris"
              />
            </div>
          </div>
        </div>

        {/* À propos */}
        <div className="dsh-card">
          <div className="ep-form">
            <h2 className="dsh-card-title">À propos</h2>
            <div>
              <label className="dsh-label" htmlFor="bio">Description</label>
              <textarea
                id="bio"
                className="dsh-textarea"
                value={form.profile.bio}
                onChange={(e) => setProfileField('bio', e.target.value)}
                placeholder="Décrivez votre entreprise et vos objectifs bien-être..."
                rows={5}
              />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="dsh-btn dsh-btn--orange" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </form>

      {/* Sécurité */}
      <PasskeyManager />

      <DeleteAccountSection />
    </div>
  );
}
