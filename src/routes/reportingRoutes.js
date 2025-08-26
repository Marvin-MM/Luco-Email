
import express from 'express';
import {
  generateDailyReport,
  generateReputationReport,
  generateCustomReport,
  scheduleAutomatedReports,
} from '../controllers/reportingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const customReportValidation = [
  body('type')
    .isIn(['email_performance', 'campaign_summary', 'usage_summary'])
    .withMessage('Invalid report type'),
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('includeDetails')
    .optional()
    .isBoolean()
    .withMessage('Include details must be a boolean'),
];

const scheduleReportValidation = [
  body('reportType')
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid report type'),
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid frequency'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipients.*')
    .isEmail()
    .withMessage('Invalid email format'),
];

// Routes
router.post(
  '/daily',
  generalRateLimit,
  generalRateLimit,
  generateDailyReport
);

router.post(
  '/reputation',
  generalRateLimit,
  generateReputationReport
);

router.post(
  '/custom',
  generalRateLimit,
  customReportValidation,
  validateRequest,
  generateCustomReport
);

router.post(
  '/schedule',
  generalRateLimit,
  scheduleReportValidation,
  validateRequest,
  scheduleAutomatedReports
);

export default router;
