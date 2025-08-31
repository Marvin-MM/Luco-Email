
import express from 'express';
import {
  createIdentity,
  getIdentities,
  getIdentityById,
  checkVerificationStatus,
  deleteIdentity,
  getDnsRecords,
} from '../controllers/identityController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit, apiRateLimit } from '../middleware/rateLimiter.js';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const createIdentityValidation = [
  body('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
  body('type')
    .isIn(['EMAIL', 'DOMAIN'])
    .withMessage('Type must be EMAIL or DOMAIN'),
  body('value')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Value must be between 1 and 255 characters')
    .toLowerCase(),
];

const applicationIdValidation = [
  param('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
];

const identityIdValidation = [
  param('identityId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid identity ID'),
];

const getIdentitiesValidation = [
  param('applicationId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid application ID'),
  query('status')
    .optional()
    .isIn(['PENDING', 'VERIFIED', 'FAILED', 'TEMPORARY_FAILURE'])
    .withMessage('Invalid status'),
  query('type')
    .optional()
    .isIn(['EMAIL', 'DOMAIN'])
    .withMessage('Type must be EMAIL or DOMAIN'),
];

// Routes
router.post(
  '/',
  generalRateLimit,
  createIdentityValidation,
  validateRequest,
  createIdentity
);

router.get(
  '/application/:applicationId',
  apiRateLimit,
  getIdentitiesValidation,
  validateRequest,
  getIdentities
);

router.get(
  '/:identityId',
  apiRateLimit,
  identityIdValidation,
  validateRequest,
  getIdentityById
);

router.get(
  '/:identityId/verify-status',
  generalRateLimit,
  identityIdValidation,
  validateRequest,
  checkVerificationStatus
);

router.get(
  '/:identityId/dns-records',
  apiRateLimit,  
  identityIdValidation,
  validateRequest,
  getDnsRecords
);

router.delete(
  '/:identityId',
  generalRateLimit,
  identityIdValidation,
  validateRequest,
  deleteIdentity
);

export default router;
