const ApiError = require('../utils/apiError');

const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    // Zod 4 expose les erreurs dans `issues` (anciennement `errors` en Zod 3).
    const issues = error.issues || error.errors;
    if (issues) {
      const messages = issues.map((e) => e.message).join(', ');
      return next(ApiError.badRequest(`Donnees invalides : ${messages}`, 'VALIDATION_ERROR'));
    }
    next(error);
  }
};

module.exports = validate;
