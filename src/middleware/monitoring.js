
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

/**
 * System health monitoring middleware
 */
export const healthCheck = async (req, res, next) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connectivity (if applicable)
    // Add other health checks as needed
    
    req.systemHealth = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
    };
    
    next();
  } catch (error) {
    logger.error('Health check failed:', error);
    req.systemHealth = {
      database: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
    next();
  }
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoring = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request performance', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
    
    // Log slow requests
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
      });
    }
  });
  
  next();
};

/**
 * Request size monitoring
 */
export const requestSizeMonitoring = (req, res, next) => {
  const contentLength = req.get('content-length');
  
  if (contentLength) {
    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
    
    if (sizeInMB > 50) { // 50MB threshold
      logger.warn('Large request detected', {
        method: req.method,
        url: req.originalUrl,
        sizeInMB: sizeInMB.toFixed(2),
      });
    }
  }
  
  next();
};
