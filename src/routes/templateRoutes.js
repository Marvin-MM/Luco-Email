import express from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  cloneTemplate,
  validateTemplateSyntax,
  getTemplateStatistics,
} from '../controllers/templateController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { templateIdValidation } from '../middleware/templateMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Template management routes
router.post('/', generalRateLimit, createTemplate);
router.get('/application/:applicationId', generalRateLimit, getTemplates);
router.get('/:templateId', generalRateLimit, getTemplateById);
router.put('/:templateId', generalRateLimit, updateTemplate);
router.delete(
  '/:templateId',
  generalRateLimit,
  templateIdValidation,
  validateRequest,
  deleteTemplate
);

router.post(
  '/validate',
  generalRateLimit,
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('htmlContent').notEmpty().withMessage('HTML content is required'),
    body('textContent').optional(),
    body('variables').optional().isObject().withMessage('Variables must be an object'),
  ],
  validateRequest,
  validateTemplateSyntax
);

router.get(
  '/:templateId/stats',
  generalRateLimit,
  templateIdValidation,
  [
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period'),
  ],
  validateRequest,
  getTemplateStatistics
);

// Template operations
router.post('/:templateId/preview', generalRateLimit, previewTemplate);
router.post('/:templateId/clone', generalRateLimit, cloneTemplate);

export default router;