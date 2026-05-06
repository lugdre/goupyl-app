const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.errorCode || 'ERROR',
      message: err.message,
    });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'DUPLICATE_ENTRY', message: 'Cette valeur existe deja.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Ressource non trouvee.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Session expiree. Reconnectez-vous.' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token invalide.' });
  }
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne.',
  });
};

module.exports = errorHandler;
