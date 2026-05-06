const { Resend } = require('resend');

// Fallback no-op si pas de clé Resend configurée
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY absent — emails désactivés');
  module.exports = {
    emails: {
      send: async () => ({ id: 'noop' }),
    },
  };
} else {
  module.exports = new Resend(process.env.RESEND_API_KEY);
}
