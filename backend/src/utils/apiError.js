class ApiError extends Error {
  constructor(statusCode, message, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }

  static badRequest(message, errorCode) {
    return new ApiError(400, message, errorCode);
  }
  static unauthorized(message = 'Non autorise') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Acces interdit', errorCode = 'FORBIDDEN') {
    return new ApiError(403, message, errorCode);
  }
  static notFound(message = 'Ressource non trouvee', errorCode = 'NOT_FOUND') {
    return new ApiError(404, message, errorCode);
  }
  static conflict(message, errorCode) {
    return new ApiError(409, message, errorCode);
  }
  static tooMany(message = 'Trop de requetes') {
    return new ApiError(429, message, 'RATE_LIMITED');
  }
}

module.exports = ApiError;
