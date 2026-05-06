const { verifyAccessToken } = require('../config/jwt');
const ApiError = require('../utils/apiError');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Token manquant. Veuillez vous connecter.');
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
