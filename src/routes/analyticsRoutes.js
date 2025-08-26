
import express from 'express';
import {
  getTenantDashboard,
  getEmailAnalytics,
  getCampaignAnalytics,
  getSystemMetrics,
  exportAnalytics,
  getTimeSeries,
  getTopPerformingContent,
  getReputationReport,
  getTenantUsageStats,
} from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const periodValidation = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Period must be 7d, 30d, or 90d'),
];

const emailAnalyticsValidation = [
  ...periodValidation,
  query('applicationId')
    .optional()
    .isUUID()
    .withMessage('Invalid application ID'),
  query('identityId')
    .optional()
    .isUUID()
    .withMessage('Invalid identity ID'),
  query('templateId')
    .optional()
    .isUUID()
    .withMessage('Invalid template ID'),
  query('granularity')
    .optional()
    .isIn(['hourly', 'daily', 'weekly'])
    .withMessage('Granularity must be hourly, daily, or weekly'),
];

const campaignAnalyticsValidation = [
  ...periodValidation,
  query('status')
    .optional()
    .isIn(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED'])
    .withMessage('Invalid status'),
  query('applicationId')
    .optional()
    .isUUID()
    .withMessage('Invalid application ID'),
];

const exportValidation = [
  ...periodValidation,
  query('type')
    .isIn('emails', 'campaigns')
    .withMessage('Export type must be emails or campaigns'),
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
];

// Routes
router.get(
  '/dashboard',
  generalRateLimit,
  periodValidation,
  validateRequest,
  getTenantDashboard
);

router.get(
  '/emails',
  generalRateLimit,
  emailAnalyticsValidation,
  validateRequest,
  getEmailAnalytics
);

router.get(
  '/campaigns',
  generalRateLimit,
  campaignAnalyticsValidation,
  validateRequest,
  getCampaignAnalytics
);

router.get(
  '/system',
  generalRateLimit,
  getSystemMetrics
);

router.get(
  '/export',
  generalRateLimit,
  exportValidation,
  validateRequest,
  exportAnalytics
);

router.get(
  '/timeseries',
  generalRateLimit,
  [
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required'),
    query('granularity').optional().isIn(['hourly', 'daily', 'weekly']).withMessage('Invalid granularity'),
    query('metric').optional().isIn(['count', 'rate']).withMessage('Invalid metric'),
  ],
  validateRequest,
  getTimeSeries
);

router.get(
  '/top-content',
  generalRateLimit,
  [
    query('contentType').optional().isIn(['templates', 'campaigns']).withMessage('Invalid content type'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  getTopPerformingContent
);

router.get(
  '/reputation',
  generalRateLimit,
  getReputationReport
);

router.get(
  '/usage-stats',
  generalRateLimit,
  [
    query('period').optional().isIn(['current_month', 'last_month', 'last_3_months']).withMessage('Invalid period'),
  ],
  validateRequest,
  getTenantUsageStats
);

export default router;
