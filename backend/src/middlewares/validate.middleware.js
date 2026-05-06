const ApiError = require('../utils/apiError');

const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    if (error.errors) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return next(ApiError.badRequest(`Donnees invalides : ${messages}`, 'VALIDATION_ERROR'));
    }
    next(error);
  }
};

module.exports = validate;
