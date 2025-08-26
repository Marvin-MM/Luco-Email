
import express from 'express';
import {
  getAdminDashboard,
  getAllTenants,
  getTenantDetails,
  updateTenant,
  getAllUsers,
  getSystemHealth,
} from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin, logAdminAction } from '../middleware/adminAuth.js';
import { generalRateLimit, apiRateLimit } from '../middleware/rateLimiter.js';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(generalRateLimit);

// Validation schemas
const tenantIdValidation = [
  param('tenantId')
    .isUUID()
    .withMessage('Invalid tenant ID'),
];

const updateTenantValidation = [
  param('tenantId')
    .isUUID()
    .withMessage('Invalid tenant ID'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
    .withMessage('Invalid status'),
  body('subscriptionPlan')
    .optional()
    .isIn(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
    .withMessage('Invalid subscription plan'),
  body('monthlyEmailLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Monthly email limit must be a non-negative integer'),
  body('customTemplateLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Custom template limit must be a non-negative integer'),
  body('attachmentSizeLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Attachment size limit must be a non-negative integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

const paginationValidation = [
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
];

const dashboardValidation = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Period must be 7d, 30d, or 90d'),
];

// Dashboard routes
router.get(
  '/dashboard',
  requireAdmin,
  dashboardValidation,
  validateRequest,
  logAdminAction('view_dashboard'),
  getAdminDashboard
);

router.get(
  '/system/health',
  requireAdmin,
  logAdminAction('view_system_health'),
  getSystemHealth
);

// Tenant management routes
router.get(
  '/tenants',
  requireAdmin,
  paginationValidation,
  validateRequest,
  logAdminAction('view_tenants'),
  getAllTenants
);

router.get(
  '/tenants/:tenantId',
  requireAdmin,
  tenantIdValidation,
  validateRequest,
  logAdminAction('view_tenant_details'),
  getTenantDetails
);

router.put(
  '/tenants/:tenantId',
  requireSuperAdmin,
  updateTenantValidation,
  validateRequest,
  logAdminAction('update_tenant'),
  updateTenant
);

// User management routes
router.get(
  '/users',
  requireAdmin,
  paginationValidation,
  validateRequest,
  logAdminAction('view_users'),
  getAllUsers
);

export default router;
