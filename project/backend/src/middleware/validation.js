const { validationResult, body, param, query } = require('express-validator');
const { sendBadRequest } = require('../utils/response');

/**
 * Runs after validators — returns 400 if any errors found
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendBadRequest(res, 'Validation failed', formatted);
  }
  next();
};

// ─── Auth Validators ──────────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),

  validate,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  validate,
];

// ─── Task Validators ──────────────────────────────────────────────────────────

const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
    .escape(),

  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'done']).withMessage('Status must be todo, in-progress, or done'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),

  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('Tags must be an array with at most 10 items'),

  validate,
];

const updateTaskValidation = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
    .escape(),

  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'done']).withMessage('Invalid status'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),

  validate,
];

const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate,
];

const taskQueryValidation = [
  query('status').optional().isIn(['todo', 'in-progress', 'done']),
  query('priority').optional().isIn(['low', 'medium', 'high']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'title', 'priority', 'dueDate']),
  query('order').optional().isIn(['asc', 'desc']),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  createTaskValidation,
  updateTaskValidation,
  mongoIdValidation,
  taskQueryValidation,
};
