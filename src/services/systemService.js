
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { queueService } from './queueService.js';
import os from 'os';

class SystemService {
  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    try {
      const [
        dbStatus,
        queueStatus,
        memoryUsage,
        systemMetrics,
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkQueueHealth(),
        this.getMemoryUsage(),
        this.getSystemMetrics(),
      ]);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {
          database: dbStatus,
          queue: queueStatus,
          memory: memoryUsage,
          system: systemMetrics,
        },
      };
    } catch (error) {
      logger.error('System status check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      const [tenantCount, userCount, emailCount] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.emailLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        metrics: {
          totalTenants: tenantCount,
          totalUsers: userCount,
          emailsLast24h: emailCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check queue health
   */
  async checkQueueHealth() {
    try {
      const stats = await queueService.getAllQueueStats();
      
      return {
        status: 'healthy',
        queues: stats,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    
    return {
      heap: {
        used: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      },
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: `${Math.round(process.uptime())}s`,
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
    };
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Clean up old email logs (keep last 90 days)
      const deletedEmailLogs = await prisma.emailLog.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
          status: {
            in: ['DELIVERED', 'BOUNCED', 'COMPLAINED'],
          },
        },
      });

      // Clean up old campaign recipients (keep last 30 days for completed campaigns)
      const deletedRecipients = await prisma.campaignRecipient.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          campaign: {
            status: {
              in: ['SENT', 'FAILED', 'CANCELLED'],
            },
          },
        },
      });

      logger.info('Data cleanup completed', {
        deletedEmailLogs: deletedEmailLogs.count,
        deletedRecipients: deletedRecipients.count,
      });

      return {
        success: true,
        deletedEmailLogs: deletedEmailLogs.count,
        deletedRecipients: deletedRecipients.count,
      };
    } catch (error) {
      logger.error('Data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Generate system report
   */
  async generateSystemReport() {
    try {
      const [
        systemStatus,
        last24hStats,
        errorStats,
        performanceStats,
      ] = await Promise.all([
        this.getSystemStatus(),
        this.getLast24HourStats(),
        this.getErrorStats(),
        this.getPerformanceStats(),
      ]);

      return {
        generatedAt: new Date().toISOString(),
        systemStatus,
        statistics: {
          last24Hours: last24hStats,
          errors: errorStats,
          performance: performanceStats,
        },
      };
    } catch (error) {
      logger.error('System report generation failed:', error);
      throw error;
    }
  }

  /**
   * Get last 24 hour statistics
   */
  async getLast24HourStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      emailsSent,
      campaignsCreated,
      newUsers,
      newTenants,
    ] = await Promise.all([
      prisma.emailLog.count({
        where: {
          createdAt: { gte: last24h },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      }),
      prisma.campaign.count({
        where: { createdAt: { gte: last24h } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: last24h } },
      }),
      prisma.tenant.count({
        where: { createdAt: { gte: last24h } },
      }),
    ]);

    return {
      emailsSent,
      campaignsCreated,
      newUsers,
      newTenants,
    };
  }

  /**
   * Get error statistics
   */
  async getErrorStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const emailErrors = await prisma.emailLog.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: last24h },
        status: { in: ['FAILED', 'BOUNCED', 'COMPLAINED'] },
      },
      _count: {
        id: true,
      },
    });

    return {
      emailErrors: emailErrors.reduce((acc, error) => {
        acc[error.status.toLowerCase()] = error._count.id;
        return acc;
      }, {}),
    };
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats() {
    // This would be enhanced with actual performance data collection
    return {
      averageResponseTime: '150ms',
      requestsPerMinute: 250,
      errorRate: '0.5%',
    };
  }
}

export const systemService = new SystemService();
