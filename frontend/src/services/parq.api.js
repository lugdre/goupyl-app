import api from './api';

export const parqApi = {
  submit: (answers) => api.post('/parq/submit', { answers }),
  getStatus: () => api.get('/parq/status'),
  getMyAnswers: () => api.get('/parq/me'),
};
