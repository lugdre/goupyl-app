const prisma = require('../config/database');
const ApiError = require('../utils/apiError');
const getStripe = require('../config/stripe');

// ── Catalogue ─────────────────────────────────────────────────────────────

const listActive = async () => {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
};

const listAll = async () => {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });
};

const createProduct = async (data) => {
  return prisma.product.create({ data });
};

const updateProduct = async (id, data) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Produit non trouvé.');
  return prisma.product.update({ where: { id }, data });
};

// Soft delete : des commandes peuvent référencer le produit
const deleteProduct = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Produit non trouvé.');
  return prisma.product.update({ where: { id }, data: { active: false } });
};

// ── Commandes (Stripe Checkout — vente plateforme, pas Connect) ──────────

const createCheckout = async (userId, productId, quantity = 1) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) throw ApiError.notFound('Produit non trouvé ou indisponible.');

  const amountCents = product.priceCents * quantity;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const order = await prisma.productOrder.create({
    data: { userId, productId, quantity, amountCents, status: 'PENDING' },
  });

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name,
            ...(product.brand && { description: product.brand }),
          },
          unit_amount: product.priceCents,
        },
        quantity,
      },
    ],
    metadata: {
      type: 'product_order',
      orderId: String(order.id),
      userId: String(userId),
    },
    success_url: `${frontendUrl}/dashboard/client/marketplace?order=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/dashboard/client/marketplace?order=cancelled`,
  });

  await prisma.productOrder.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { url: session.url };
};

const getMyOrders = async (userId) => {
  return prisma.productOrder.findMany({
    where: { userId },
    include: { product: { select: { name: true, imageUrl: true, brand: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

// Appelé par le webhook checkout.session.completed. Idempotent (updateMany
// conditionné sur PENDING) : le double déclenchement webhook + redirect est sans effet.
const fulfillOrderFromSession = async (session) => {
  if (session.payment_status !== 'paid') return;
  const orderId = parseInt(session.metadata?.orderId);
  if (!orderId) return;
  await prisma.productOrder.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAID' },
  });
};

// Fallback appelé par le frontend sur le redirect de succès (si le webhook
// n'est pas encore passé / pas configuré).
const verifyOrder = async (sessionId, userId) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.type !== 'product_order' || session.metadata?.userId !== String(userId)) {
    throw ApiError.forbidden('Session invalide.');
  }
  if (session.payment_status !== 'paid') {
    throw ApiError.badRequest("Le paiement n'est pas complété.");
  }
  await fulfillOrderFromSession(session);
  return prisma.productOrder.findUnique({
    where: { id: parseInt(session.metadata.orderId) },
    include: { product: { select: { name: true } } },
  });
};

module.exports = {
  listActive,
  listAll,
  createProduct,
  updateProduct,
  deleteProduct,
  createCheckout,
  getMyOrders,
  fulfillOrderFromSession,
  verifyOrder,
};
