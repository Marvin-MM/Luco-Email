
import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  sendCampaign,
  cancelCampaign,
  getCampaignAnalytics,
  deleteCampaign,
} from '../controllers/campaignController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit, emailRateLimit } from '../middleware/rateLimiter.js';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const createCampaignValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Campaign name must be between 1 and 200 characters'),
  body('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
  body('templateId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid template ID'),
  body('identityId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid identity ID'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Subject cannot exceed 300 characters'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled date format'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Recipients must be a non-empty array'),
  body('recipients.*')
    .custom((value) => {
      if (typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      }
      if (typeof value === 'object' && value.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value.email);
      }
      return false;
    })
    .withMessage('Invalid recipient format'),
  body('variables')
    .optional()
    .isObject()
    .withMessage('Variables must be an object'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
];

const sendCampaignValidation = [
  param('campaignId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid campaign ID'),
  body('batchSize')
    .optional()
    .isInt({ min: 10, max: 1000 })
    .withMessage('Batch size must be between 10 and 1000'),
  body('delayBetweenBatches')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('Delay between batches must be between 1000ms and 60000ms'),
];

const campaignIdValidation = [
  param('campaignId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid campaign ID'),
];

const getCampaignsValidation = [
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
    .isIn(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED'])
    .withMessage('Invalid status value'),
  query('applicationId')
    .optional()
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'sentAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

// Routes
router.post(
  '/',
  generalRateLimit,
  createCampaignValidation,
  validateRequest,
  createCampaign
);

router.get(
  '/',
  generalRateLimit,
  getCampaignsValidation,
  validateRequest,
  getCampaigns
);

router.get(
  '/:campaignId',
  generalRateLimit,
  campaignIdValidation,
  validateRequest,
  getCampaignById
);

router.post(
  '/:campaignId/send',
  emailRateLimit,
  sendCampaignValidation,
  validateRequest,
  sendCampaign
);

router.post(
  '/:campaignId/cancel',
  generalRateLimit,
  campaignIdValidation,
  validateRequest,
  cancelCampaign
);

router.get(
  '/:campaignId/analytics',
  generalRateLimit,
  campaignIdValidation,
  validateRequest,
  getCampaignAnalytics
);

router.delete(
  '/:campaignId',
  generalRateLimit,
  campaignIdValidation,
  validateRequest,
  deleteCampaign
);

export default router;
