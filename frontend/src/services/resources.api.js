import api from './api';

export const resourcesApi = {
  getAll: (params = {}) => api.get('/resources', { params }),
  getById: (id) => api.get(`/resources/${id}`),
};
