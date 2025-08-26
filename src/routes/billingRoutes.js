
import express from 'express';
import {
  getSubscription,
  getPlans,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getBillingHistory,
  getUsageAnalytics,
  calculateUsageCharges,
  generateUsageReport,
  getTenantBillingSummary,
  // checkEmailLimits,
  checkTemplateLimits,
} from '../controllers/billingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Webhook route (no auth required, uses Stripe signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Apply authentication middleware to all other routes
router.use(authenticateToken);

// Validation schemas
const createCheckoutValidation = [
  body('planId')
    .isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
    .withMessage('Invalid plan ID'),
];

const billingHistoryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const usageAnalyticsValidation = [
  query('period')
    .optional()
    .isIn(['current_month', 'last_month'])
    .withMessage('Period must be current_month or last_month'),
];

// Routes
router.get(
  '/subscription',
  generalRateLimit,
  getSubscription
);

router.get(
  '/plans',
  generalRateLimit,
  getPlans
);

router.post(
  '/checkout',
  generalRateLimit,
  createCheckoutValidation,
  validateRequest,
  createCheckoutSession
);

router.post(
  '/portal',
  generalRateLimit,
  createPortalSession
);

router.get(
  '/history',
  generalRateLimit,
  billingHistoryValidation,
  validateRequest,
  getBillingHistory
);

router.get(
  '/usage',
  generalRateLimit,
  usageAnalyticsValidation,
  validateRequest,
  getUsageAnalytics
);

router.get(
  '/charges',
  generalRateLimit,
  [
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required'),
  ],
  validateRequest,
  calculateUsageCharges
);

router.get(
  '/report',
  generalRateLimit,
  [
    query('year').isInt({ min: 2020, max: 2030 }).withMessage('Valid year is required'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
  ],
  validateRequest,
  generateUsageReport
);

router.get(
  '/summary',
  generalRateLimit,
  getTenantBillingSummary
);

// router.get(
//   '/limits/email',
//   generalRateLimit,
//   [
//     query('emailCount').optional().isInt({ min: 1 }).withMessage('Email count must be positive'),
//   ],
//   validateRequest,
//   checkEmailLimits
// );

router.get(
  '/limits/template',
  generalRateLimit,
  checkTemplateLimits
);

export default router;
