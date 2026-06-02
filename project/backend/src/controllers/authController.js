const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendBadRequest,
  sendConflict,
  sendError,
} = require('../utils/response');

// ─── Token Generators ─────────────────────────────────────────────────────────

const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendConflict(res, 'Email is already registered');
    }

    const user = await User.create({ name, email, password });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens = [refreshToken];
    await user.save();

    logger.info(`New user registered: ${email}`);

    return sendCreated(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    }, 'Registration successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login and receive JWT tokens
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');

    if (!user || !(await user.comparePassword(password))) {
      return sendUnauthorized(res, 'Invalid email or password');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Account has been deactivated');
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Append refresh token (keep last 5 sessions)
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    return sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Issue a new access token using refresh token
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return sendBadRequest(res, 'Refresh token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return sendUnauthorized(res, 'Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens?.includes(token)) {
      return sendUnauthorized(res, 'Refresh token not recognized');
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens
      .filter((t) => t !== token)
      .concat(newRefreshToken);
    await user.save();

    return sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout and invalidate refresh token
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== token);
        await user.save();
      }
    }

    logger.info(`User logged out: ${req.user.email}`);
    return sendSuccess(res, {}, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user's profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout, getMe };
