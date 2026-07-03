import api from './api';

export const productApi = {
  getAll: () => api.get('/products'),
  getAllAdmin: () => api.get('/products/all'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
  checkout: (id, quantity = 1) => api.post(`/products/${id}/checkout`, { quantity }),
  getMyOrders: () => api.get('/products/orders/me'),
  verifyOrder: (sessionId) => api.get('/products/orders/verify', { params: { session_id: sessionId } }),
};
