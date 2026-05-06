import api from './api';

export const reviewApi = {
  create: (data) => api.post('/reviews', data),
  getForIntervenant: (intervenantId) => api.get(`/reviews/intervenant/${intervenantId}`),
  getByAppointment: (appointmentId) => api.get(`/reviews/appointment/${appointmentId}`),
  // Intervenant-side
  getByAppointmentAsIntervenant: (appointmentId) => api.get(`/reviews/my-appointment/${appointmentId}`),
  replyToReview: (reviewId, reply) => api.put(`/reviews/${reviewId}/reply`, { reply }),
};
