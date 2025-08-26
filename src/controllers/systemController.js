
import { systemService } from '../services/systemService.js';
import { logger } from '../utils/logger.js';

/**
 * Get system status
 */
export const getSystemStatus = async (req, res) => {
  try {
    const systemStatus = await systemService.getSystemStatus();
    
    res.json({
      success: true,
      data: systemStatus,
    });
  } catch (error) {
    logger.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Generate system report
 */
export const generateSystemReport = async (req, res) => {
  try {
    const report = await systemService.generateSystemReport();
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Generate system report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate system report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Cleanup old data
 */
export const cleanupOldData = async (req, res) => {
  try {
    const result = await systemService.cleanupOldData();
    
    res.json({
      success: true,
      data: result,
      message: 'System cleanup completed successfully',
    });
  } catch (error) {
    logger.error('System cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup system data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get database health
 */
export const getDatabaseHealth = async (req, res) => {
  try {
    const dbHealth = await systemService.checkDatabaseHealth();
    
    res.json({
      success: true,
      data: dbHealth,
    });
  } catch (error) {
    logger.error('Get database health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check database health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get queue health
 */
export const getQueueHealth = async (req, res) => {
  try {
    const queueHealth = await systemService.checkQueueHealth();
    
    res.json({
      success: true,
      data: queueHealth,
    });
  } catch (error) {
    logger.error('Get queue health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check queue health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get system metrics
 */
// export const getSystemMetrics = async (req, res) => {
//   try {
//     const metrics = await systemService.getSystemMetrics();
    
//     res.json({
//       success: true,
//       data: metrics,
//     });
//   } catch (error) {
//     logger.error('Get system metrics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch system metrics',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined,
//     });
//   }
// };

/**
 * Get error statistics
 */
export const getErrorStats = async (req, res) => {
  try {
    const errorStats = await systemService.getErrorStats();
    
    res.json({
      success: true,
      data: errorStats,
    });
  } catch (error) {
    logger.error('Get error stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get performance statistics
 */
export const getPerformanceStats = async (req, res) => {
  try {
    const perfStats = await systemService.getPerformanceStats();
    
    res.json({
      success: true,
      data: perfStats,
    });
  } catch (error) {
    logger.error('Get performance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get system metrics
 */
export const getSystemMetrics = async (req, res) => {
  try {
    const metrics = systemService.getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get memory usage
 */
export const getMemoryUsage = async (req, res) => {
  try {
    const memoryUsage = systemService.getMemoryUsage();
    
    res.json({
      success: true,
      data: memoryUsage,
    });
  } catch (error) {
    logger.error('Get memory usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch memory usage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
