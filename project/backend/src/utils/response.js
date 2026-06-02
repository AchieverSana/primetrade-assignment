/**
 * Standardized API response helpers
 */

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendCreated = (res, data = {}, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendUnauthorized = (res, message = 'Unauthorized') => sendError(res, message, 401);
const sendForbidden = (res, message = 'Forbidden') => sendError(res, message, 403);
const sendNotFound = (res, message = 'Resource not found') => sendError(res, message, 404);
const sendBadRequest = (res, message = 'Bad Request', errors = null) => sendError(res, message, 400, errors);
const sendConflict = (res, message = 'Conflict') => sendError(res, message, 409);

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendBadRequest,
  sendConflict,
};
