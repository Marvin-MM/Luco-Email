import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { RATE_LIMITS } from '../utils/constants.js';

// Basic rate limiter
export const rateLimitConfig = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: {
      type: 'RateLimitError',
      code: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: {
        type: 'RateLimitError',
        code: 429
      }
    });
  }
});

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs, // Use constant for windowMs
  max: RATE_LIMITS.AUTH.max, // Use constant for max requests
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: {
      type: 'AuthRateLimitError',
      code: 429
    }
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      error: {
        type: 'AuthRateLimitError',
        code: 429
      }
    });
  }
});

// Email sending rate limiter - tenant specific
export const emailRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs, // Use standard window
  max: (req) => {
    // Rate limit based on user's subscription plan
    const plan = req.user?.tenant?.subscriptionPlan || 'FREE';
    const limits = {
      FREE: RATE_LIMITS.EMAIL.FREE,      // Use constant
      STANDARD: RATE_LIMITS.EMAIL.STANDARD, // Use constant
      ESSENTIAL: RATE_LIMITS.EMAIL.ESSENTIAL, // Use constant
      PREMIUM: RATE_LIMITS.EMAIL.PREMIUM  // Use constant
    };
    return limits[plan] || RATE_LIMITS.EMAIL.DEFAULT; // Use constant
  },
  keyGenerator: (req) => {
    // Rate limit per tenant, not per IP
    return `email_${req.user?.tenantId || req.ip}`;
  },
  message: {
    success: false,
    message: 'Email sending rate limit exceeded. Please upgrade your plan for higher limits.',
    error: {
      type: 'EmailRateLimitError',
      code: 429
    }
  },
  handler: (req, res) => {
    logger.warn('Email rate limit exceeded', {
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      plan: req.user?.tenant?.subscriptionPlan,
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      success: false,
      message: 'Email sending rate limit exceeded. Please upgrade your plan for higher limits.',
      error: {
        type: 'EmailRateLimitError',
        code: 429
      }
    });
  }
});

// OTP rate limiter
export const otpRateLimit = rateLimit({
  windowMs: RATE_LIMITS.OTP.windowMs, // Use constant for windowMs
  max: RATE_LIMITS.OTP.max, // Use constant for max requests
  keyGenerator: (req) => {
    // Rate limit per email or IP
    return req.body?.email || req.ip;
  },
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait before requesting another.',
    error: {
      type: 'OTPRateLimitError',
      code: 429
    }
  },
  handler: (req, res) => {
    logger.warn('OTP rate limit exceeded', {
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait before requesting another.',
      error: {
        type: 'OTPRateLimitError',
        code: 429
      }
    });
  }
});

// API key rate limiter
export const apiRateLimit = rateLimit({
  windowMs: RATE_LIMITS.API.windowMs, // Use constant for windowMs
  max: RATE_LIMITS.API.max, // Use constant for max requests
  keyGenerator: (req) => {
    // Rate limit per API key
    return req.apiKey?.id;
  },
  message: {
    success: false,
    message: 'Too many API key requests. Please wait before requesting another.',
    error: {
      type: 'APIKeyRateLimitError',
      code: 429
    }
  },
  handler: (req, res) => {
    logger.warn('API key rate limit exceeded', {
      apiKeyId: req.apiKey?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      message: 'Too many API key requests. Please wait before requesting another.',
      error: {
        type: 'APIKeyRateLimitError',
        code: 429
      }
    });
  }
});

// General rate limiter
export const generalRateLimit = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.windowMs, // Use constant for windowMs
  max: RATE_LIMITS.GENERAL.max, // Use constant for max requests
  message: {
    success: false,
    message: 'Too many requests. Please wait before requesting another.',
    error: {
      type: 'GeneralRateLimitError',
      code: 429
    }
  },
  handler: (req, res) => {
    logger.warn('General rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait before requesting another.',
      error: {
        type: 'GeneralRateLimitError',
        code: 429
      }
    });
  }
});
