import api from './api';

export const coachServiceApi = {
  getByIntervenant: (intervenantId) => api.get(`/coach-services/intervenant/${intervenantId}`),
  getMine: () => api.get('/coach-services/mine'),
  create: (data) => api.post('/coach-services', data),
  update: (id, data) => api.put(`/coach-services/${id}`, data),
  remove: (id) => api.delete(`/coach-services/${id}`),
};
