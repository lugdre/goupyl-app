import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../../services/product.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { ShoppingBag, Package, Receipt } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const ORDER_BADGE_VARIANT = { PENDING: 'PENDING', PAID: 'CONFIRMED', CANCELLED: 'CANCELLED' };

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary-600" />
          Boutique
        </h1>
        <p className="text-gray-500 mt-1">
          Équipements et nutrition sélectionnés par nos partenaires — livrés directement par la marque.
        </p>
      </div>

      {/* Grille produits */}
      {products.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun produit disponible pour le moment</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <div className="h-36 rounded-xl bg-gray-100 flex items-center justify-center mb-4 overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
                  {product.category && <span className="text-xs text-gray-400">{product.category}</span>}
                </div>
                <p className="font-semibold text-gray-900">{product.name}</p>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xl font-bold text-gray-900">
                  {(product.priceCents / 100).toFixed(2)} €
                </span>
                <Button size="sm" loading={buyingId === product.id} onClick={() => handleBuy(product)}>
                  Acheter
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Mes commandes */}
      {orders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" />
            Mes commandes
          </h2>
          <div className="space-y-2 max-w-2xl">
            {orders.map((order) => (
              <Card key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{order.product?.name}</p>
                    <p className="text-xs text-gray-500">
                      {order.quantity > 1 ? `${order.quantity} × ` : ''}
                      {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-gray-900">{(order.amountCents / 100).toFixed(2)} €</span>
                    <Badge variant={ORDER_BADGE_VARIANT[order.status] || 'PENDING'}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
