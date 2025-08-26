
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

export const errorHandler = (err, req, res, next) => {
  const { method, url, ip } = req;
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId;

  // Log error with context
  logger.error('Request Error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method,
      url,
      ip,
      userAgent: req.get('User-Agent'),
      userId,
      tenantId
    }
  });

  // Handle specific error types
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details;
  } else if (err.name === 'UnauthorizedError' || err.message?.includes('unauthorized')) {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError' || err.message?.includes('forbidden')) {
    statusCode = 403;
    message = 'Access forbidden';
  } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.name === 'ConflictError' || err.message?.includes('conflict')) {
    statusCode = 409;
    message = 'Resource conflict';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
  } else if (err.name === 'PaymentRequiredError') {
    statusCode = 402;
    message = 'Payment required';
  }

  // Prisma specific errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // AWS SES specific errors
  if (err.name === 'MessageRejected') {
    statusCode = 422;
    message = 'Email message rejected';
    details = err.message;
  } else if (err.name === 'SendingPausedException') {
    statusCode = 423;
    message = 'Email sending paused';
    details = 'Email sending is temporarily paused for this account';
  }

  // Stripe specific errors
  if (err.type === 'StripeCardError') {
    statusCode = 402;
    message = 'Payment failed';
    details = err.message;
  } else if (err.type === 'StripeInvalidRequestError') {
    statusCode = 400;
    message = 'Invalid payment request';
    details = err.message;
  }

  const errorResponse = {
    success: false,
    message,
    error: {
      type: err.name || 'ServerError',
      code: err.code || statusCode
    }
  };

  // Add details in development or if explicitly set
  if (config.nodeEnv === 'development' || details) {
    errorResponse.error.details = details || err.message;
  }

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required') {
    super(message, 402);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}
