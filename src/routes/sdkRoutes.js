
import express from 'express';
import { authenticateApiKey, requirePermission, logApiResponse } from '../middleware/apiKeyAuth.js';
import { sendBulkEmail, sendEmail } from '../controllers/emailController.js';
import { getTemplates } from '../controllers/templateController.js';
import { getIdentities } from '../controllers/identityController.js';
// import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { validateRequest } from '../middleware/validation.js';
import { body, query } from 'express-validator';

const router = express.Router();

// Apply API key authentication and response logging to all routes
router.use(authenticateApiKey);
router.use(logApiResponse);

// Email sending validation
const sendEmailValidation = [
  body('to')
    .isEmail()
    .withMessage('Valid recipient email is required'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 998 })
    .withMessage('Subject must be between 1 and 998 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content cannot be empty'),
  body('template')
    .optional()
    .isObject()
    .withMessage('Template must be an object'),
  body('template.id')
    .optional()
    .isUUID()
    .withMessage('Template ID must be a valid UUID'),
  body('template.variables')
    .optional()
    .isObject()
    .withMessage('Template variables must be an object'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  body('replyTo')
    .optional()
    .isEmail()
    .withMessage('Reply-to must be a valid email address')
];

const sendBulkEmailValidation = [
  body('recipients')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Recipients must be an array with 1-1000 items'),
  body('recipients.*.email')
    .isEmail()
    .withMessage('Each recipient must have a valid email'),
  body('recipients.*.variables')
    .optional()
    .isObject()
    .withMessage('Recipient variables must be an object'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 998 })
    .withMessage('Subject must be between 1 and 998 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content cannot be empty'),
  body('template')
    .optional()
    .isObject()
    .withMessage('Template must be an object'),
  body('template.id')
    .optional()
    .isUUID()
    .withMessage('Template ID must be a valid UUID')
];

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      apiVersion: '1.0.0',
      tenant: {
        id: req.tenant.id,
        name: req.tenant.organizationName,
        plan: req.tenant.subscriptionPlan
      },
      permissions: req.apiKey.permissions,
      rateLimit: {
        limit: req.apiKey.rateLimit,
        remaining: req.apiKey.rateLimit - req.apiKey.requestsThisHour,
        resetAt: new Date(req.apiKey.lastResetAt.getTime() + 60 * 60 * 1000).toISOString()
      }
    }
  });
});

// Email sending endpoints
router.post('/email/send', 
  requirePermission('send_email'),
  sendEmailValidation,
  validateRequest,
  async (req, res) => {
    // Transform request for the existing email controller
    const emailData = {
      applicationId: req.body.applicationId || null, // Optional for SDK
      to: [req.body.to],
      subject: req.body.subject,
      htmlContent: req.body.content?.html,
      textContent: req.body.content?.text,
      templateId: req.body.template?.id,
      templateVariables: req.body.template?.variables || {},
      replyTo: req.body.replyTo,
      attachments: req.body.attachments || []
    };
    
    req.body = emailData;
    await sendEmail(req, res);
  }
);

router.post('/email/send-bulk',
  requirePermission('send_email'),
  sendBulkEmailValidation,
  validateRequest,
  async (req, res) => {
    // Transform request for the existing email controller
    const emailData = {
      applicationId: req.body.applicationId || null,
      recipients: req.body.recipients,
      subject: req.body.subject,
      htmlContent: req.body.content?.html,
      textContent: req.body.content?.text,
      templateId: req.body.template?.id,
      replyTo: req.body.replyTo,
      attachments: req.body.attachments || []
    };
    
    req.body = emailData;
    await sendBulkEmail(req, res);
  }
);

// Template management endpoints
router.get('/templates',
  requirePermission('manage_templates'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  validateRequest,
  getTemplates
);

// Identity management endpoints
router.get('/identities',
  requirePermission('manage_identities'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  getIdentities
);

// Analytics endpoints
// router.get('/analytics',
//   requirePermission('view_analytics'),
//   query('startDate').optional().isISO8601(),
//   query('endDate').optional().isISO8601(),
//   validateRequest,
//   getAnalyticsSummary
// );

export default router;
