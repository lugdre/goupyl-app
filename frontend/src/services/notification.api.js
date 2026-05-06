import api from './api';

export const notificationApi = {
  list: () => api.get('/notifications'),
  countUnread: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
};
