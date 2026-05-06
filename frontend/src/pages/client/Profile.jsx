import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import PasskeyManager from '../../components/PasskeyManager';
import { User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', profile: { city: '', objectives: [], constraints: '' } });

  useEffect(() => {
    userApi.getMe().then(({ data }) => {
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        profile: {
          city: data.profile?.city || '',
          objectives: data.profile?.objectives || [],
          constraints: data.profile?.constraints || '',
          bio: data.profile?.bio || '',
          level: data.profile?.level || 'DEBUTANT',
        },
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.updateMe(form);
      toast.success('Profil mis a jour');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1">Gerez vos informations personnelles</p>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-brand-800" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{authUser.firstName} {authUser.lastName}</p>
            <p className="text-sm text-gray-500">{authUser.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prenom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Telephone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+33 6 xx xx xx xx" />
          <Input
            label="Ville"
            value={form.profile.city}
            onChange={(e) => setForm({ ...form, profile: { ...form.profile, city: e.target.value } })}
            placeholder="Paris"
          />
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Contraintes physiques</label>
            <textarea
              value={form.profile.constraints}
              onChange={(e) => setForm({ ...form, profile: { ...form.profile, constraints: e.target.value } })}
              placeholder="Blessures, limitations..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              rows={3}
            />
          </div>
          <Button type="submit" loading={saving}>Sauvegarder</Button>
        </form>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Sécurité</h2>
        <PasskeyManager />
      </div>
    </div>
  );
}
