const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendUnauthorized, sendForbidden } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verify JWT access token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendUnauthorized(res, 'Access token has expired');
      }
      return sendUnauthorized(res, 'Invalid access token');
    }

    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user || !user.isActive) {
      return sendUnauthorized(res, 'User not found or account deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Role-based access control middleware factory
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return sendForbidden(
        res,
        `Role '${req.user.role}' is not authorized to access this resource`
      );
    }

    next();
  };
};

/**
 * Optional auth — attaches user if token present, but doesn't block if absent
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    if (user?.isActive) req.user = user;
  } catch {
    // Silently continue without user
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
