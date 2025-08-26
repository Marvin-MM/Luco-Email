
import express from 'express';
import {
  createApiKey,
  getApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  getApiKeyUsage
} from '../controllers/apiKeyController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const createApiKeyValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('permissions.*')
    .optional()
    .isIn(['send_email', 'manage_templates', 'manage_identities', 'view_analytics', 'manage_campaigns', 'admin'])
    .withMessage('Invalid permission'),
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Expiration must be between 1 and 365 days'),
  body('rateLimit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Rate limit must be between 1 and 10000 requests per hour'),
  body('ipWhitelist')
    .optional()
    .isArray()
    .withMessage('IP whitelist must be an array'),
  body('ipWhitelist.*')
    .optional()
    .isIP()
    .withMessage('Invalid IP address in whitelist')
];

const updateApiKeyValidation = [
  param('apiKeyId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid API key ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('permissions.*')
    .optional()
    .isIn(['send_email', 'manage_templates', 'manage_identities', 'view_analytics', 'manage_campaigns', 'admin'])
    .withMessage('Invalid permission'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('rateLimit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Rate limit must be between 1 and 10000 requests per hour'),
  body('ipWhitelist')
    .optional()
    .isArray()
    .withMessage('IP whitelist must be an array'),
  body('ipWhitelist.*')
    .optional()
    .isIP()
    .withMessage('Invalid IP address in whitelist')
];

const apiKeyIdValidation = [
  param('apiKeyId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid API key ID')
];

const usageQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

// Routes
router.post('/', createApiKeyValidation, validateRequest, createApiKey);
router.get('/', getApiKeys);
router.get('/:apiKeyId', apiKeyIdValidation, validateRequest, getApiKeyById);
router.put('/:apiKeyId', updateApiKeyValidation, validateRequest, updateApiKey);
router.delete('/:apiKeyId', apiKeyIdValidation, validateRequest, deleteApiKey);
router.get('/:apiKeyId/usage', apiKeyIdValidation, usageQueryValidation, validateRequest, getApiKeyUsage);

export default router;
