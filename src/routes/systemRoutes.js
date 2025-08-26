import express from 'express';
import {
  getSystemStatus,
  generateSystemReport,
  cleanupOldData,
  getDatabaseHealth,
  getQueueHealth,
  getSystemMetrics,
  getErrorStats,
  getPerformanceStats,
} from '../controllers/systemController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication and admin middleware
router.use(authenticateToken);
router.use(requireAdmin);
router.use(generalRateLimit);

/**
 * Get system status
 */
router.get('/status', getSystemStatus);

/**
 * Get database health
 */
router.get('/health/database', getDatabaseHealth);

/**
 * Get queue health
 */
router.get('/health/queue', getQueueHealth);

/**
 * Get system metrics
 */
router.get('/metrics', getSystemMetrics);

/**
 * Get error statistics
 */
router.get('/error-stats', getErrorStats);

/**
 * Get performance statistics
 */
router.get('/performance', getPerformanceStats);

/**
 * Generate system report
 */
router.get('/report', generateSystemReport);

/**
 * Cleanup old data
 */
router.post('/cleanup', cleanupOldData);

export default router;