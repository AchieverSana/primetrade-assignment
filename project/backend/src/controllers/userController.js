const User = require('../models/User');
const Task = require('../models/Task');
const { sendSuccess, sendNotFound, sendBadRequest } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get a user by ID (admin only)
 * @access  Private/Admin
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, 'User not found');
    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return sendBadRequest(res, 'Role must be user or admin');
    }

    // Prevent admins from demoting themselves
    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return sendBadRequest(res, 'Admins cannot demote themselves');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) return sendNotFound(res, 'User not found');

    logger.info(`User role updated: ${user.email} → ${role} by admin: ${req.user.email}`);
    return sendSuccess(res, { user }, 'User role updated');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Activate or deactivate a user account (admin only)
 * @access  Private/Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendBadRequest(res, 'Admins cannot deactivate their own account');
    }

    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, 'User not found');

    user.isActive = !user.isActive;
    await user.save();

    logger.info(
      `User ${user.isActive ? 'activated' : 'deactivated'}: ${user.email} by admin: ${req.user.email}`
    );
    return sendSuccess(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete a user and their tasks (admin only)
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendBadRequest(res, 'Admins cannot delete their own account');
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendNotFound(res, 'User not found');

    // Cascade delete tasks
    await Task.deleteMany({ owner: req.params.id });

    logger.info(`User deleted: ${user.email} by admin: ${req.user.email}`);
    return sendSuccess(res, {}, 'User and associated tasks deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, updateUserRole, toggleUserStatus, deleteUser };
