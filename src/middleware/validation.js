import { validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

/**
 * Middleware to handle validation errors from express-validator
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
    });
  }

  next();
};

/**
 * Custom validation functions
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateDomain = (domain) => {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

export const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

/**
 * Validate template variable structure
 */
export const validateTemplateVariable = (variable) => {
  const requiredFields = ['name', 'type'];
  const validTypes = ['STRING', 'NUMBER', 'EMAIL', 'URL', 'DATE', 'BOOLEAN'];

  // Check required fields
  for (const field of requiredFields) {
    if (!variable[field]) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate type
  if (!validTypes.includes(variable.type)) {
    return { isValid: false, error: `Invalid variable type: ${variable.type}` };
  }

  // Validate name format
  const namePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!namePattern.test(variable.name)) {
    return { isValid: false, error: 'Variable name must start with letter or underscore and contain only letters, numbers, and underscores' };
  }

  return { isValid: true };
};

/**
 * Validate template content for security issues
 */
export const validateTemplateContent = (content) => {
  const errors = [];

  // Check for potential XSS patterns
  const xssPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(content)) {
      errors.push('Template contains potentially unsafe content');
      break;
    }
  }

  // Check for unclosed HTML tags
  const openTags = content.match(/<[^/][^>]*>/g) || [];
  const closeTags = content.match(/<\/[^>]*>/g) || [];

  if (openTags.length !== closeTags.length) {
    errors.push('Template contains unclosed HTML tags');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};