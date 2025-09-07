
import express from 'express';
import {
  getQueueStats,
  getSpecificQueueStats,
  pauseQueue,
  resumeQueue,
  testQueue,
  getQueueHealth,
} from '../controllers/queueController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Public health check endpoint
router.get('/health', getQueueHealth);

// Apply authentication middleware to all other routes
router.use(authenticateToken);

// Validation schemas
const queueNameValidation = [
  param('queueName')
    .isIn(['email', 'campaign', 'verification', 'analytics', 'billing'])
    .withMessage('Invalid queue name'),
];

const testQueueValidation = [
  body('queueName')
    .isIn(['email', 'campaign', 'verification', 'analytics', 'billing'])
    .withMessage('Invalid queue name'),
  body('jobType')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Job type is required and must be less than 100 characters'),
  body('testData')
    .optional()
    .isObject()
    .withMessage('Test data must be an object'),
];

// Routes
router.get(
  '/stats',
  generalRateLimit,
  generalRateLimit,
  getQueueStats
);

router.get(
  '/:queueName/stats',
  generalRateLimit,  
  queueNameValidation,
  validateRequest,
  getSpecificQueueStats
);

// Admin-only routes
router.post(
  '/:queueName/pause',
  requireSuperAdmin,
  generalRateLimit,
  queueNameValidation,
  validateRequest,
  pauseQueue
);

router.post(
  '/:queueName/resume',
  requireSuperAdmin,
  generalRateLimit,
  queueNameValidation,
  validateRequest,
  resumeQueue
);

router.post(
  '/test',
  // requireSuperAdmin,
  generalRateLimit,
  testQueueValidation,
  validateRequest,
  testQueue
);

export default router;
