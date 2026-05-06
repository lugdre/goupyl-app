import api from './api';

export const companyApi = {
  getEmployees: () => api.get('/companies/employees'),
  removeEmployee: (id) => api.delete(`/companies/employees/${id}`),

  getJoinCode: () => api.get('/companies/join-code'),
  regenerateJoinCode: () => api.post('/companies/join-code/regenerate'),

  getInvites: () => api.get('/companies/invites'),
  createInvite: (email) => api.post('/companies/invites', { email }),
  deleteInvite: (id) => api.delete(`/companies/invites/${id}`),

  getEmployerPlan: () => api.get('/companies/employer-plan'),
  getUsageStats: () => api.get('/companies/usage'),
  getEmployeeStats: () => api.get('/companies/employee-stats'),
};
