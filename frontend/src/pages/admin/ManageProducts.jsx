import { useState, useEffect } from 'react';
import { productApi } from '../../services/product.api';
import Spinner from '../../components/ui/Spinner';
import { MODAL_CSS } from '../../components/ui/modalStyles';
import { Package, Plus, Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', description: '', price: '', brand: '', category: '', imageUrl: '', externalProviderUrl: '' };

const MP_CSS = `
  .mp-list{display:flex;flex-direction:column;gap:10px}
  .mp-item{border:1px solid var(--line);border-radius:16px;padding:18px 20px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;transition:border-color .2s}
  .mp-item:hover{border-color:#c9c7c1}
  .mp-item.is-off{opacity:.65;background:#FAF9F7}
  .mp-thumb{width:52px;height:52px;border-radius:12px;background:linear-gradient(145deg,#EFEDE8,#DCDAD4);display:flex;align-items:center;justify-content:center;color:#8a8781;flex-shrink:0;overflow:hidden}
  .mp-thumb img{width:100%;height:100%;object-fit:cover}
  .mp-info{flex:1;min-width:180px;display:flex;align-items:center;gap:14px}
  .mp-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .mp-name{font-size:14.5px;font-weight:600;color:var(--ink);margin:0}
  .mp-meta{font-size:12.5px;color:var(--ink-3);margin:4px 0 0}
  .mp-price{font-size:17px;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
  .mp-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
  .mp-icon-btn{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
  .mp-icon-btn:hover:not(:disabled){border-color:var(--orange);color:var(--orange)}
  .mp-icon-btn.is-danger:hover:not(:disabled){border-color:#EFC7BE;color:#C0392B;background:#FBEAE7}
  .mp-icon-btn:disabled{opacity:.5;cursor:not-allowed}
`;

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
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon"><Package size={17} /></div>
            <h2 className="gm-title">{product ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gm-body">
          <div>
            <label className="gm-label" htmlFor="pName">Nom *</label>
            <input id="pName" className="dsh-input" value={form.name} onChange={set('name')} required minLength={2} maxLength={120} />
          </div>

          <div>
            <label className="gm-label" htmlFor="pDesc">Description</label>
            <textarea id="pDesc" className="gm-textarea" value={form.description} onChange={set('description')} rows={3} maxLength={2000} />
          </div>

          <div className="dsh-row">
            <div>
              <label className="gm-label" htmlFor="pPrice">Prix (€) *</label>
              <input id="pPrice" className="dsh-input" type="number" step="0.01" min="0.01" value={form.price} onChange={set('price')} required />
            </div>
            <div>
              <label className="gm-label" htmlFor="pBrand">Marque</label>
              <input id="pBrand" className="dsh-input" value={form.brand} onChange={set('brand')} maxLength={80} />
            </div>
          </div>

          <div>
            <label className="gm-label" htmlFor="pCat">Catégorie</label>
            <input id="pCat" className="dsh-input" value={form.category} onChange={set('category')} maxLength={80} placeholder="Équipement, Nutrition…" />
          </div>

          <div>
            <label className="gm-label" htmlFor="pImg">URL image</label>
            <input id="pImg" className="dsh-input" type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
          </div>

          <div>
            <label className="gm-label" htmlFor="pProv">URL fournisseur (dropshipping)</label>
            <input id="pProv" className="dsh-input" type="url" value={form.externalProviderUrl} onChange={set('externalProviderUrl')} placeholder="https://…" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="gm-btn gm-btn--ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="gm-btn gm-btn--orange" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Enregistrement…' : product ? 'Enregistrer' : 'Créer'}
            </button>
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
    <div className="dsh-page" style={{ maxWidth: 900 }}>
      <style>{MP_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Produits marketplace</h1>
          <p className="dsh-sub">Catalogue de la boutique (dropshipping partenaires)</p>
        </div>
        <button type="button" className="dsh-btn dsh-btn--orange" onClick={() => setEditing('new')}>
          <Plus size={15} />Nouveau produit
        </button>
      </div>

      {products.length === 0 ? (
        <div className="dsh-empty">
          <Package size={26} />
          Aucun produit — créez le premier
        </div>
      ) : (
        <div className="mp-list">
          {products.map((product) => (
            <div key={product.id} className={`mp-item${product.active ? '' : ' is-off'}`}>
              <div className="mp-info">
                <div className="mp-thumb">
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} />
                    : <Package size={20} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="mp-name-row">
                    <p className="mp-name">{product.name}</p>
                    {product.brand && <span className="dsh-badge dsh-badge--orange">{product.brand}</span>}
                    {!product.active && <span className="dsh-badge dsh-badge--err"><i />Retiré</span>}
                  </div>
                  <p className="mp-meta">
                    {product._count?.orders ?? 0} commande{(product._count?.orders ?? 0) > 1 ? 's' : ''}
                    {product.category && ` · ${product.category}`}
                  </p>
                </div>
              </div>

              <div className="mp-actions">
                <span className="mp-price">{(product.priceCents / 100).toFixed(2)} €</span>
                <button type="button" className="mp-icon-btn" onClick={() => setEditing(product)} title="Modifier">
                  <Pencil size={15} />
                </button>
                {product.active ? (
                  <button
                    type="button"
                    className="mp-icon-btn is-danger"
                    disabled={togglingId === product.id}
                    onClick={() => handleToggleActive(product)}
                    title="Retirer de la boutique"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="dsh-btn dsh-btn--ghost dsh-btn--sm"
                    disabled={togglingId === product.id}
                    onClick={() => handleToggleActive(product)}
                  >
                    <RotateCcw size={13} />Republier
                  </button>
                )}
              </div>
            </div>
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
