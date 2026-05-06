const ApiError = require('../utils/apiError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Acces reserve aux roles : ${allowedRoles.join(', ')}`));
  }
  next();
};

module.exports = authorize;
