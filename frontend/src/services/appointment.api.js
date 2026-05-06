import api from './api';

export const appointmentApi = {
  create: (data) => api.post('/appointments', data),
  getMyAppointments: (params) => api.get('/appointments/me', { params }),
  getAll: (params) => api.get('/appointments', { params }),
  updateStatus: (id, status, cancelReason) =>
    api.patch(`/appointments/${id}/status`, { status, cancelReason }),
  getBusySlots: (intervenantId, from, to) =>
    api.get(`/appointments/busy/${intervenantId}`, { params: { from, to } }),
  cancel: (id, reason) => api.post(`/appointments/${id}/cancel`, { reason }),
  getMyBusySlots: (from, to) => api.get('/appointments/me/busy-slots', { params: { from, to } }),
};
