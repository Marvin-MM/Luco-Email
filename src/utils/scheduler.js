import cron from 'node-cron';
import { tenantService } from '../services/tenantService.js';
import { reportingService } from '../services/reportingService.js';
import { logger } from './logger.js';

class Scheduler {
  /**
   * Initialize all scheduled tasks
   */
  static initialize() {
    this.scheduleMonthlyReset();
    this.scheduleDailyCleanup();
    this.scheduleDailyReporting();
    this.scheduleWeeklyReporting();
    logger.info('Scheduler initialized successfully');
  }

  /**
   * Schedule monthly usage reset - runs on the 1st of every month at 00:00
   */
  static scheduleMonthlyReset() {
    cron.schedule('0 0 1 * *', async () => {
      try {
        logger.info('Starting monthly usage reset...');
        await tenantService.resetMonthlyUsage();
        logger.info('Monthly usage reset completed successfully');
      } catch (error) {
        logger.error('Monthly usage reset failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Monthly usage reset scheduler configured');
  }

  /**
   * Schedule daily cleanup tasks - runs every day at 02:00
   */
  static scheduleDailyCleanup() {
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily cleanup tasks...');

        // Clean up old email logs (older than 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        await prisma.emailLog.deleteMany({
          where: {
            createdAt: { lt: oneYearAgo }
          }
        });

        logger.info('Daily cleanup completed successfully');
      } catch (error) {
        logger.error('Daily cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Daily cleanup scheduler configured');
  }

  /**
   * Schedule daily reports at 6 AM
   */
  static scheduleDailyReporting() {
    cron.schedule('0 6 * * *', async () => {
      try {
        logger.info('Starting daily report generation');

        // Get all active tenants
        const tenants = await tenantService.getAllActiveTenants();

        for (const tenant of tenants) {
          try {
            await reportingService.generateDailyReport(tenant.id);
            logger.info(`Daily report generated for tenant: ${tenant.id}`);
          } catch (error) {
            logger.error(`Failed to generate daily report for tenant ${tenant.id}:`, error);
          }
        }

        logger.info('Daily report generation completed');
      } catch (error) {
        logger.error('Daily report generation failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Daily reporting scheduler configured');
  }

  /**
   * Schedule weekly reputation reports every Monday at 8 AM
   */
  static scheduleWeeklyReporting() {
    cron.schedule('0 8 * * 1', async () => {
      try {
        logger.info('Starting weekly reputation report generation');

        // Get all active tenants
        const tenants = await tenantService.getAllActiveTenants();

        for (const tenant of tenants) {
          try {
            await reportingService.generateWeeklyReputationReport(tenant.id);
            logger.info(`Weekly reputation report generated for tenant: ${tenant.id}`);
          } catch (error) {
            logger.error(`Failed to generate reputation report for tenant ${tenant.id}:`, error);
          }
        }

        logger.info('Weekly reputation report generation completed');
      } catch (error) {
        logger.error('Weekly reputation report generation failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Weekly reporting scheduler configured');
  }
}

export { Scheduler };