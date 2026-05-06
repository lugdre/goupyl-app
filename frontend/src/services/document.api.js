import api from './api';

export const documentApi = {
  upload: (type, file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMine: () => api.get('/documents/mine'),
  remove: (id) => api.delete(`/documents/${id}`),
  // Admin only
  download: (id) => api.get(`/documents/${id}/file`, { responseType: 'blob' }),
};
