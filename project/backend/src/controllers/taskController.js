const Task = require('../models/Task');
const {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendForbidden,
  sendError,
} = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/tasks
 * @desc    Get all tasks (users see their own; admins see all)
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Base filter: admins see everything, users see only their own
    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.$text = { $search: search };

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('owner', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + limitNum < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get a single task by ID
 * @access  Private
 */
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('owner', 'name email');

    if (!task) return sendNotFound(res, 'Task not found');

    // Non-admins can only access their own tasks
    if (req.user.role !== 'admin' && task.owner._id.toString() !== req.user._id.toString()) {
      return sendForbidden(res, 'You do not have permission to view this task');
    }

    return sendSuccess(res, { task });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      owner: req.user._id,
    });

    await task.populate('owner', 'name email');

    logger.info(`Task created: ${task._id} by user: ${req.user._id}`);
    return sendCreated(res, { task }, 'Task created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Update a task
 * @access  Private (owner or admin)
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return sendNotFound(res, 'Task not found');

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      return sendForbidden(res, 'You do not have permission to update this task');
    }

    const allowedUpdates = ['title', 'description', 'status', 'priority', 'dueDate', 'tags'];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    await task.populate('owner', 'name email');

    logger.info(`Task updated: ${task._id} by user: ${req.user._id}`);
    return sendSuccess(res, { task }, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task
 * @access  Private (owner or admin)
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return sendNotFound(res, 'Task not found');

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      return sendForbidden(res, 'You do not have permission to delete this task');
    }

    await task.deleteOne();

    logger.info(`Task deleted: ${req.params.id} by user: ${req.user._id}`);
    return sendSuccess(res, {}, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/tasks/stats
 * @desc    Get task statistics for the current user (or all if admin)
 * @access  Private
 */
const getTaskStats = async (req, res, next) => {
  try {
    const match = req.user.role === 'admin' ? {} : { owner: req.user._id };

    const stats = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const priorityStats = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Task.countDocuments(match);

    return sendSuccess(res, {
      total,
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byPriority: priorityStats.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getTaskStats };
