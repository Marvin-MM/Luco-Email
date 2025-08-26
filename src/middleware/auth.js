
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            status: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if tenant is active
    if (user.tenant.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended or pending verification',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user is a super admin
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
  }
  next();
};

/**
 * Middleware to ensure user belongs to the specified tenant
 */
export const requireTenantAccess = (req, res, next) => {
  const tenantId = req.params.tenantId || req.body.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID required',
    });
  }

  if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this tenant',
    });
  }

  next();
};

/**
 * Middleware for optional authentication (user may or may not be logged in)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            status: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    req.user = user || null;
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    req.user = null;
    next();
  }
};

/**
 * Middleware to refresh access token using refresh token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true,
      },
    });

    if (!user || user.tenant.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    logger.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token refresh failed',
    });
  }
};
