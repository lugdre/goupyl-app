import api from './api';

export const subscriptionApi = {
  subscribe: (plan, billingCycle = 'MONTHLY') => api.post('/subscriptions', { plan, billingCycle }),
  getMine: () => api.get('/subscriptions/mine'),
  cancel: (id) => api.patch(`/subscriptions/${id}/cancel`),
  getAll: (params) => api.get('/subscriptions', { params }),
};
