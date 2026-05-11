import { useState, useEffect } from 'react';
import { serviceApi } from '../../services/service.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Dumbbell, Plus, Trash2, Edit2 } from 'lucide-react';
import { CATEGORY_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const CATEGORIES = ['SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'];

const DEFAULT_FORM = {
  name: '', description: '', category: 'SPORT',
  durationMinutes: 60, price: 50,
};

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = () => {
    setLoading(true);
    serviceApi
      .getAll({ page: 1, limit: 100 })
      .then(({ data }) => setServices(data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await serviceApi.update(editingId, form);
        toast.success('Service mis à jour');
      } else {
        await serviceApi.create(form);
        toast.success('Service créé');
      }
      setForm(DEFAULT_FORM);
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setForm({
      name: service.name,
      description: service.description || '',
      category: service.category,
      durationMinutes: service.durationMinutes,
      price: service.price,
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce service ?')) return;
    try {
      await serviceApi.remove(id);
      toast.success('Service supprimé');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCancel = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestion des services</h1>
          <p className="text-gray-500 mt-1">{services.length} service{services.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { handleCancel(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" />
          Nouveau service
        </Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="font-medium text-gray-900 mb-4">
            {editingId ? 'Modifier le service' : 'Nouveau service'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Nom du service"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Durée (minutes)"
                type="number"
                min={15}
                max={240}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) })}
                required
              />
              <Input
                label="Prix (€)"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={handleCancel}>Annuler</Button>
              <Button type="submit" loading={saving}>
                {editingId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : services.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Dumbbell className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun service</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={service.category}>{CATEGORY_LABELS[service.category]}</Badge>
                  </div>
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span>{service.durationMinutes} min</span>
                    <span>•</span>
                    <span>{Number(service.price).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
