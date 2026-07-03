import { useState, useEffect } from 'react';
import { productApi } from '../../services/product.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', description: '', price: '', brand: '', category: '', imageUrl: '', externalProviderUrl: '' };

function ProductFormModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name,
          description: product.description || '',
          price: (product.priceCents / 100).toFixed(2),
          brand: product.brand || '',
          category: product.category || '',
          imageUrl: product.imageUrl || '',
          externalProviderUrl: product.externalProviderUrl || '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(String(form.price).replace(',', '.')) * 100);
    if (!priceCents || priceCents <= 0) {
      toast.error('Prix invalide');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        priceCents,
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.brand.trim() && { brand: form.brand.trim() }),
        ...(form.category.trim() && { category: form.category.trim() }),
        ...(form.imageUrl.trim() && { imageUrl: form.imageUrl.trim() }),
        ...(form.externalProviderUrl.trim() && { externalProviderUrl: form.externalProviderUrl.trim() }),
      };
      if (product) {
        await productApi.update(product.id, payload);
        toast.success('Produit mis à jour');
      } else {
        await productApi.create(payload);
        toast.success('Produit créé');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border overflow-hidden max-h-[90vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-gray-900">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05]">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <Input label="Nom *" value={form.name} onChange={set('name')} required minLength={2} maxLength={120} />
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prix (€) *" type="number" step="0.01" min="0.01" value={form.price} onChange={set('price')} required />
            <Input label="Marque" value={form.brand} onChange={set('brand')} maxLength={80} />
          </div>
          <Input label="Catégorie" value={form.category} onChange={set('category')} maxLength={80} placeholder="Équipement, Nutrition…" />
          <Input label="URL image" type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
          <Input label="URL fournisseur (dropshipping)" type="url" value={form.externalProviderUrl} onChange={set('externalProviderUrl')} placeholder="https://…" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {product ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [togglingId, setTogglingId] = useState(null);

  const fetchProducts = () => {
    productApi
      .getAllAdmin()
      .then(({ data }) => setProducts(data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchProducts, []);

  const handleToggleActive = async (product) => {
    setTogglingId(product.id);
    try {
      if (product.active) {
        await productApi.remove(product.id); // soft delete
        toast.success('Produit retiré de la boutique');
      } else {
        await productApi.update(product.id, { active: true });
        toast.success('Produit republié');
      }
      fetchProducts();
    } catch {
      toast.error('Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" />
            Produits marketplace
          </h1>
          <p className="text-gray-500 mt-1">Catalogue de la boutique (dropshipping partenaires)</p>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="w-4 h-4 mr-1.5" />Nouveau produit
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun produit — créez le premier</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2 max-w-3xl">
          {products.map((product) => (
            <Card key={product.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
                    {!product.active && <Badge variant="CANCELLED">Retiré</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {(product.priceCents / 100).toFixed(2)} € · {product._count?.orders ?? 0} commande(s)
                    {product.category && ` · ${product.category}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(product)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant={product.active ? 'danger' : 'success'}
                    loading={togglingId === product.id}
                    onClick={() => handleToggleActive(product)}
                    title={product.active ? 'Retirer de la boutique' : 'Republier'}
                  >
                    {product.active ? <Trash2 className="w-3.5 h-3.5" /> : 'Republier'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
}
