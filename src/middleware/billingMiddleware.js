
import { billingService } from '../services/billingService.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to check email sending limits
 */
export const checkEmailLimit = (emailCount = 1) => {
  return async (req, res, next) => {
    try {
      const { tenantId } = req.user;
      
      // Allow override for email count from request body
      const actualEmailCount = req.body.recipients?.length || emailCount;
      
      const limitCheck = await billingService.checkEmailLimit(tenantId, actualEmailCount);
      
      if (!limitCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: limitCheck.reason,
          data: {
            remaining: limitCheck.remaining,
            limit: limitCheck.limit,
            used: limitCheck.used,
          },
        });
      }
      
      // Add limit info to request for potential use in controllers
      req.emailLimit = limitCheck;
      next();
    } catch (error) {
      logger.error('Email limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check email limits',
      });
    }
  };
};

/**
 * Middleware to check template creation limits
 */
export const checkTemplateLimit = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    
    const limitCheck = await billingService.checkTemplateLimit(tenantId);
    
    if (!limitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: limitCheck.reason,
        data: {
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          used: limitCheck.used,
        },
      });
    }
    
    req.templateLimit = limitCheck;
    next();
  } catch (error) {
    logger.error('Template limit check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check template limits',
    });
  }
};

/**
 * Middleware to check active subscription
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }
    
    const now = new Date();
    const isExpired = tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < now;
    
    if (tenant.subscriptionStatus !== 'ACTIVE' || isExpired) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        data: {
          subscriptionStatus: tenant.subscriptionStatus,
          subscriptionEndsAt: tenant.subscriptionEndsAt,
        },
      });
    }
    
    next();
  } catch (error) {
    logger.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status',
    });
  }
};

/**
 * Middleware to track billable events
 */
export const trackBillableEvent = (eventType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only track if the response is successful
      if (data.success !== false) {
        billingService.trackBillableEvent(
          req.user.tenantId,
          eventType,
          {
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
          }
        ).catch(error => {
          logger.error('Failed to track billable event:', error);
        });
      }
      
      // Call original res.json
      return originalJson.call(this, data);
    };
    
    next();
  };
};
