import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DeleteAccountSection from '../../components/profile/DeleteAccountSection';
import PasskeyManager from '../../components/PasskeyManager';

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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profil entreprise</h1>
        <p className="text-gray-500 mt-1">Gérez les informations de votre entreprise</p>
      </div>

      {/* Company identity */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {form.companyName || authUser?.companyName || 'Mon entreprise'}
            </p>
            <p className="text-sm text-gray-500">{authUser?.email}</p>
            <p className="text-sm text-violet-600 font-medium mt-0.5">Compte entreprise</p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Informations entreprise */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Informations entreprise</h2>
          <Input
            label="Nom de l'entreprise"
            value={form.companyName}
            onChange={(e) => setField('companyName', e.target.value)}
            placeholder="Acme Corp"
          />
        </Card>

        {/* Contact */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Contact</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom du contact"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
              />
              <Input
                label="Nom du contact"
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
            <Input
              label="Ville (optionnel)"
              value={form.profile.city}
              onChange={(e) => setProfileField('city', e.target.value)}
              placeholder="Paris"
            />
          </div>
        </Card>

        {/* À propos */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">À propos</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-900">Description</label>
            <textarea
              value={form.profile.bio}
              onChange={(e) => setProfileField('bio', e.target.value)}
              placeholder="Décrivez votre entreprise et vos objectifs bien-être..."
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
        </Card>

        <Button type="submit" loading={saving}>
          Sauvegarder
        </Button>
      </form>
      
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Sécurité</h2>
        <PasskeyManager />
      </div>

      <DeleteAccountSection />
    </div>
  );
}
