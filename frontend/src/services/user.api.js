import api from './api';

export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  getIntervenants: (params) => api.get('/users/intervenants', { params }),
  getIntervenantById: (id) => api.get(`/users/intervenants/${id}`),
  getAllUsers: (params) => api.get('/users', { params }),
  deactivateUser: (id) => api.patch(`/users/${id}/deactivate`),
  activateUser: (id) => api.patch(`/users/${id}/activate`),
  getPendingVerifications: () => api.get('/users/verifications/pending'),
  verifyUser: (id, status, note) => api.patch(`/users/${id}/verify`, { status, note }),
  deleteMe: () => api.delete('/users/me'),
  uploadAvatar: (formData) => api.post('/users/me/avatar', formData),
  getPhotos: (intervenantId) => api.get(`/users/${intervenantId}/photos`),
  uploadPhoto: (formData) => api.post('/users/me/photos', formData),
  deletePhoto: (photoId) => api.delete(`/users/me/photos/${photoId}`),
};
