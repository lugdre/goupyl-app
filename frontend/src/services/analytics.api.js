import api from './api';

export const analyticsApi = {
  getEntreprise: () => api.get('/analytics/entreprise'),
  getAdmin: () => api.get('/analytics/admin'),
};
