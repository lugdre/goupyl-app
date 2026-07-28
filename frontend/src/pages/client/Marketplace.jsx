import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../../services/product.api';
import Spinner from '../../components/ui/Spinner';
import { Package, Receipt } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const ORDER_BADGE_CLASS = { PENDING: 'dsh-badge--wait', PAID: 'dsh-badge--ok', CANCELLED: 'dsh-badge--err' };

const MP_CSS = `
  .mp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  @media(max-width:1100px){.mp-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:640px){.mp-grid{grid-template-columns:1fr}}
  .mp-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;transition:border-color .2s,transform .15s ease,box-shadow .2s}
  .mp-card:hover{border-color:#c9c7c1;transform:translateY(-2px);box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .mp-thumb{height:158px;border-radius:14px;background:linear-gradient(145deg,#EFEDE8,#DCDAD4);display:flex;align-items:center;justify-content:center;color:#8a8781;overflow:hidden;margin-bottom:16px}
  .mp-thumb img{width:100%;height:100%;object-fit:cover}
  .mp-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
  .mp-brand{font-size:11.5px;font-weight:600;padding:4px 11px;border-radius:999px;background:var(--orange-soft);color:var(--orange)}
  .mp-cat{font-size:12px;color:var(--ink-3)}
  .mp-name{font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--ink);margin:0}
  .mp-desc{font-size:13px;color:var(--ink-3);line-height:1.5;margin:6px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .mp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
  .mp-price{font-size:22px;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
  .mp-orders{display:flex;flex-direction:column;gap:10px}
  .mp-order{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
  .mp-order-name{font-size:14px;font-weight:600;color:var(--ink);margin:0}
  .mp-order-date{font-size:12px;color:var(--ink-3);margin:3px 0 0}
  .mp-order-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
  .mp-order-amount{font-size:15px;font-weight:700;color:var(--ink)}
`;

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  const fetchAll = () => {
    Promise.all([
      productApi.getAll().then(({ data }) => setProducts(data)),
      productApi.getMyOrders().then(({ data }) => setOrders(data)),
    ])
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, []);

  // Retour de Stripe Checkout : confirme la commande côté serveur (fallback
  // sans webhook) puis nettoie l'URL.
  useEffect(() => {
    const orderStatus = searchParams.get('order');
    const sessionId = searchParams.get('session_id');
    if (orderStatus === 'success' && sessionId) {
      productApi
        .verifyOrder(sessionId)
        .then(({ data }) => toast.success(`Commande confirmée : ${data.product?.name || 'produit'} !`))
        .catch(() => toast.error('Impossible de confirmer la commande — contactez le support.'))
        .finally(() => {
          setSearchParams({}, { replace: true });
          fetchAll();
        });
    } else if (orderStatus === 'cancelled') {
      toast('Commande annulée.', { icon: 'ℹ️' });
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (product) => {
    setBuyingId(product.id);
    try {
      const { data } = await productApi.checkout(product.id);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'achat");
      setBuyingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="dsh-page">
      <style>{MP_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Boutique</h1>
          <p className="dsh-sub">
            Équipements et nutrition sélectionnés par nos partenaires — livrés directement par la marque.
          </p>
        </div>
        {orders.length > 0 && (
          <span className="dsh-badge dsh-badge--orange">
            <Receipt size={13} /> {orders.length} commande{orders.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grille produits */}
      {products.length === 0 ? (
        <div className="dsh-empty">
          <Package size={26} />
          Aucun produit disponible pour le moment
        </div>
      ) : (
        <div className="mp-grid">
          {products.map((product) => (
            <article key={product.id} className="mp-card">
              <div className="mp-thumb">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} />
                ) : (
                  <Package size={26} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="mp-meta">
                  {product.brand && <span className="mp-brand">{product.brand}</span>}
                  {product.category && <span className="mp-cat">{product.category}</span>}
                </div>
                <h3 className="mp-name">{product.name}</h3>
                {product.description && <p className="mp-desc">{product.description}</p>}
              </div>
              <div className="mp-foot">
                <span className="mp-price">
                  {(product.priceCents / 100).toFixed(2)} €
                </span>
                <button
                  type="button"
                  className="dsh-btn dsh-btn--orange dsh-btn--sm"
                  disabled={buyingId === product.id}
                  onClick={() => handleBuy(product)}
                >
                  {buyingId === product.id ? 'Redirection…' : 'Acheter'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Mes commandes */}
      {orders.length > 0 && (
        <div>
          <h2 className="dsh-card-title" style={{ marginBottom: 14 }}>Mes commandes</h2>
          <div className="mp-orders">
            {orders.map((order) => (
              <div key={order.id} className="mp-order">
                <div style={{ minWidth: 0 }}>
                  <p className="mp-order-name">{order.product?.name}</p>
                  <p className="mp-order-date">
                    {order.quantity > 1 ? `${order.quantity} × ` : ''}
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="mp-order-right">
                  <span className="mp-order-amount">{(order.amountCents / 100).toFixed(2)} €</span>
                  <span className={`dsh-badge ${ORDER_BADGE_CLASS[order.status] || 'dsh-badge--neutral'}`}>
                    <i />{ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
