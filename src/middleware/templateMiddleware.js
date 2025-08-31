
import { param } from 'express-validator';
import { generalRateLimit as generalApiRateLimit } from './rateLimiter.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

/**
 * Template ID validation middleware
 */
export const templateIdValidation = [
  param('templateId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Template ID must be a valid UUID'),
];

/**
 * General rate limiting for template operations
 */
export const generalRateLimit = generalApiRateLimit;

/**
 * Template ownership verification middleware
 */
export const verifyTemplateOwnership = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { tenantId } = req.user;
    
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        tenantId,
      },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied',
      });
    }
    
    req.template = template;
    next();
  } catch (error) {
    logger.error('Template ownership verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify template ownership',
    });
  }
};

/**
 * Template status validation middleware
 */
export const validateTemplateStatus = (req, res, next) => {
  const { isActive } = req.body;
  
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isActive must be a boolean value',
    });
  }
  
  next();
};
