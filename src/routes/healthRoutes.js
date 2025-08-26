
import express from 'express';
import { prisma } from '../config/database.js';
import { redisManager } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req, res) => {
  const healthChecks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      memory: { status: 'unknown' },
    },
  };

  try {
    // Database health check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.checks.database = {
      status: 'healthy',
      responseTime: `${Date.now() - dbStart}ms`,
    };
  } catch (error) {
    healthChecks.checks.database = {
      status: 'unhealthy',
      error: error.message,
    };
    healthChecks.status = 'unhealthy';
  }

  try {
    // Redis health check
    const redisStart = Date.now();
    const redis = redisManager.getClient();
    await redis.ping();
    healthChecks.checks.redis = {
      status: 'healthy',
      responseTime: `${Date.now() - redisStart}ms`,
    };
  } catch (error) {
    healthChecks.checks.redis = {
      status: 'unhealthy',
      error: error.message,
    };
    healthChecks.status = 'unhealthy';
  }

  // Memory health check
  const memUsage = process.memoryUsage();
  const memThreshold = 1024 * 1024 * 1024; // 1GB threshold
  
  healthChecks.checks.memory = {
    status: memUsage.rss < memThreshold ? 'healthy' : 'warning',
    usage: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
  };

  const statusCode = healthChecks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthChecks);
});

export default router;
