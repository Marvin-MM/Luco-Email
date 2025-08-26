
import { queueService } from '../services/queueService.js';
import { emailQueueService } from '../services/emailQueueService.js';
import { logger } from '../utils/logger.js';

/**
 * Get queue statistics
 */
export const getQueueStats = async (req, res) => {
  try {
    const stats = await emailQueueService.getQueueStats();
    
    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue statistics',
    });
  }
};

/**
 * Get specific queue statistics
 */
export const getSpecificQueueStats = async (req, res) => {
  try {
    const { queueName } = req.params;
    
    const stats = await queueService.getQueueStats(queueName);
    
    res.json({
      success: true,
      data: {
        queueName,
        stats,
      },
    });
  } catch (error) {
    logger.error('Get specific queue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue statistics',
    });
  }
};

/**
 * Pause a queue
 */
export const pauseQueue = async (req, res) => {
  try {
    const { queueName } = req.params;
    
    await queueService.pauseQueue(queueName);
    
    res.json({
      success: true,
      message: `Queue ${queueName} paused successfully`,
    });
  } catch (error) {
    logger.error('Pause queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause queue',
    });
  }
};

/**
 * Resume a queue
 */
export const resumeQueue = async (req, res) => {
  try {
    const { queueName } = req.params;
    
    await queueService.resumeQueue(queueName);
    
    res.json({
      success: true,
      message: `Queue ${queueName} resumed successfully`,
    });
  } catch (error) {
    logger.error('Resume queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume queue',
    });
  }
};

/**
 * Test queue functionality
 */
export const testQueue = async (req, res) => {
  try {
    const { queueName, jobType, testData } = req.body;
    
    const job = await queueService.addJob(queueName, jobType, {
      ...testData,
      isTest: true,
      triggeredBy: req.user.id,
    });
    
    res.json({
      success: true,
      message: 'Test job queued successfully',
      data: {
        jobId: job.id,
        queueName,
        jobType,
      },
    });
  } catch (error) {
    logger.error('Test queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue test job',
    });
  }
};

/**
 * Queue health check
 */
export const getQueueHealth = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queues: {},
    };

    const queueNames = ['email', 'campaign', 'verification', 'analytics', 'billing'];
    
    for (const queueName of queueNames) {
      try {
        const stats = await queueService.getQueueStats(queueName);
        health.queues[queueName] = {
          status: 'operational',
          waitingJobs: stats.waiting?.length || 0,
          activeJobs: stats.active?.length || 0,
          failedJobs: stats.failed?.length || 0,
          completedJobs: stats.completed?.length || 0,
          delayedJobs: stats.delayed?.length || 0,
        };
      } catch (error) {
        health.queues[queueName] = {
          status: 'error',
          error: error.message,
        };
        health.status = 'degraded';
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status !== 'error',
      data: health,
    });
  } catch (error) {
    logger.error('Queue health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Queue health check failed',
    });
  }
};
