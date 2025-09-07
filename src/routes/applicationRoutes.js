
import express from 'express';
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getApplicationStats,
} from '../controllers/applicationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit, apiRateLimit } from '../middleware/rateLimiter.js';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const createApplicationValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Application name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Application name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object'),
];

const updateApplicationValidation = [
  param('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Application name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Application name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('defaultIdentityId')
    .optional()
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid default identity ID'),
];

const applicationIdValidation = [
  param('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
];


const getApplicationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
];

const statsValidation = [
  param('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Period must be 7d, 30d, or 90d'),
];

// Routes
router.post(
  '/',
  generalRateLimit,
  createApplicationValidation,
  validateRequest,
  createApplication
);

router.get(
  '/',
  apiRateLimit,
  getApplicationsValidation,
  validateRequest,
  getApplications
);

router.get(
  '/:applicationId',
  apiRateLimit,
  applicationIdValidation,
  validateRequest,
  getApplicationById
);

router.put(
  '/:applicationId',
  generalRateLimit,  
  updateApplicationValidation,
  validateRequest,
  updateApplication
);

router.delete(
  '/:applicationId',
  generalRateLimit,
  applicationIdValidation,
  validateRequest,
  deleteApplication
);

router.get(
  '/:applicationId/stats',
  apiRateLimit,
  statsValidation,
  validateRequest,
  getApplicationStats
);

export default router;
