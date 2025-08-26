
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to verify super admin access
 */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user is a super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required',
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    logger.error('Super admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization verification failed',
    });
  }
};

/**
 * Middleware to verify admin access (admin or super admin)
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    logger.error('Admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization verification failed',
    });
  }
};

/**
 * Middleware to log admin actions
 */
export const logAdminAction = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log admin action after response is sent
      process.nextTick(() => {
        logger.info('Admin action performed', {
          adminId: req.admin?.id,
          adminEmail: req.admin?.email,
          action,
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: res.statusCode < 400,
          statusCode: res.statusCode,
        });
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
