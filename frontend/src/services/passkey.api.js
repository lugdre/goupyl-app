import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from './api';

export const passkeyApi = {
  list: () => api.get('/passkeys'),
  remove: (id) => api.delete(`/passkeys/${id}`),

  // Register a new passkey for the logged-in user
  register: async (nickname) => {
    const { data: options } = await api.post('/passkeys/register/begin');
    const response = await startRegistration({ optionsJSON: options });
    const { data } = await api.post('/passkeys/register/finish', { response, nickname });
    return data;
  },

  // Passwordless login with a passkey
  authenticate: async (email) => {
    const { data: options } = await api.post('/passkeys/auth/begin', { email });
    const { _scopeId: scopeId, ...publicKeyOptions } = options;
    const response = await startAuthentication({ optionsJSON: publicKeyOptions });
    const { data } = await api.post('/passkeys/auth/finish', { scopeId, response });
    return data;
  },
};

export const isPasskeySupported = () =>
  typeof window !== 'undefined' &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === 'function';
