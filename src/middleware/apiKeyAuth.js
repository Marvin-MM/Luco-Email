
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to authenticate API keys
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'API key required. Format: Authorization: Bearer your-api-key',
        error: { type: 'ApiKeyMissing', code: 401 }
      });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key cannot be empty',
        error: { type: 'ApiKeyInvalid', code: 401 }
      });
    }

    // Hash the provided API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            status: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            monthlyEmailLimit: true,
            emailsSentThisMonth: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    if (!apiKeyRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        error: { type: 'ApiKeyInvalid', code: 401 }
      });
    }

    // Check if API key is active
    if (!apiKeyRecord.isActive) {
      return res.status(401).json({
        success: false,
        message: 'API key has been disabled',
        error: { type: 'ApiKeyDisabled', code: 401 }
      });
    }

    // Check if API key has expired
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      return res.status(401).json({
        success: false,
        message: 'API key has expired',
        error: { type: 'ApiKeyExpired', code: 401 }
      });
    }

    // Check if tenant is active
    if (apiKeyRecord.tenant.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended or pending verification',
        error: { type: 'TenantSuspended', code: 403 }
      });
    }

    // Check if user is active
    if (!apiKeyRecord.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is deactivated',
        error: { type: 'UserDeactivated', code: 403 }
      });
    }

    // Rate limiting check
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Reset hourly counter if needed
    if (apiKeyRecord.lastResetAt < hourAgo) {
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: {
          requestsThisHour: 1,
          lastResetAt: now,
          lastUsedAt: now,
          totalRequests: { increment: 1 }
        }
      });
    } else if (apiKeyRecord.requestsThisHour >= apiKeyRecord.rateLimit) {
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Maximum ${apiKeyRecord.rateLimit} requests per hour.`,
        error: { 
          type: 'RateLimitExceeded', 
          code: 429,
          details: {
            limit: apiKeyRecord.rateLimit,
            windowSeconds: apiKeyRecord.rateLimitWindow,
            resetAt: new Date(apiKeyRecord.lastResetAt.getTime() + 60 * 60 * 1000).toISOString()
          }
        }
      });
    } else {
      // Increment usage counter
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: {
          requestsThisHour: { increment: 1 },
          lastUsedAt: now,
          totalRequests: { increment: 1 }
        }
      });
    }

    // Log API usage
    await prisma.apiKeyUsage.create({
      data: {
        apiKeyId: apiKeyRecord.id,
        endpoint: req.path,
        method: req.method,
        statusCode: 0, // Will be updated by response middleware
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestSize: req.get('Content-Length') ? parseInt(req.get('Content-Length')) : null
      }
    });

    // Attach API key info to request
    req.apiKey = apiKeyRecord;
    req.user = apiKeyRecord.user;
    req.tenant = apiKeyRecord.tenant;
    
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: { type: 'AuthenticationError', code: 500 }
    });
  }
};

/**
 * Middleware to check API key permissions
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key authentication required',
        error: { type: 'AuthenticationRequired', code: 401 }
      });
    }

    if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required`,
        error: { 
          type: 'InsufficientPermissions', 
          code: 403,
          details: { requiredPermission: permission }
        }
      });
    }

    next();
  };
};

/**
 * Middleware to log API response
 */
export const logApiResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log response if this was an API key request
    if (req.apiKey) {
      const responseSize = data ? Buffer.byteLength(data, 'utf8') : 0;
      
      // Update the API usage record with response details
      prisma.apiKeyUsage.updateMany({
        where: {
          apiKeyId: req.apiKey.id,
          statusCode: 0, // Find the record we created in authenticateApiKey
          createdAt: {
            gte: new Date(Date.now() - 5000) // Within last 5 seconds
          }
        },
        data: {
          statusCode: res.statusCode,
          responseSize,
          responseTime: Date.now() - req.startTime
        }
      }).catch(err => {
        logger.error('Failed to update API usage log:', err);
      });
    }
    
    originalSend.call(this, data);
  };

  req.startTime = Date.now();
  next();
};
