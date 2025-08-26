
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

class BillingService {
  /**
   * Check if tenant has reached email sending limit
   */
  async checkEmailLimit(tenantId, emailCount = 1) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          monthlyEmailLimit: true,
          subscriptionStatus: true,
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (tenant.subscriptionStatus !== 'ACTIVE') {
        return {
          allowed: false,
          reason: 'Subscription not active',
          remaining: 0,
        };
      }

      // Get current month usage
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const currentUsage = await prisma.emailLog.count({
        where: {
          tenantId,
          createdAt: { gte: currentMonth },
        },
      });

      const remaining = tenant.monthlyEmailLimit - currentUsage;
      const allowed = remaining >= emailCount;

      return {
        allowed,
        reason: allowed ? null : 'Monthly email limit exceeded',
        remaining: Math.max(0, remaining),
        limit: tenant.monthlyEmailLimit,
        used: currentUsage,
      };
    } catch (error) {
      logger.error('Check email limit error:', error);
      throw error;
    }
  }

  /**
   * Check if tenant can create more custom templates
   */
  async checkTemplateLimit(tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          customTemplateLimit: true,
          subscriptionStatus: true,
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (tenant.subscriptionStatus !== 'ACTIVE') {
        return {
          allowed: false,
          reason: 'Subscription not active',
          remaining: 0,
        };
      }

      const currentUsage = await prisma.template.count({
        where: {
          tenantId,
          type: 'CUSTOM',
        },
      });

      const remaining = tenant.customTemplateLimit - currentUsage;
      const allowed = remaining > 0;

      return {
        allowed,
        reason: allowed ? null : 'Custom template limit reached',
        remaining: Math.max(0, remaining),
        limit: tenant.customTemplateLimit,
        used: currentUsage,
      };
    } catch (error) {
      logger.error('Check template limit error:', error);
      throw error;
    }
  }

  /**
   * Calculate usage-based charges (for potential pay-per-use features)
   */
  async calculateUsageCharges(tenantId, startDate, endDate) {
    try {
      const [
        emailsSent,
        templatesCreated,
        campaignsLaunched,
      ] = await Promise.all([
        prisma.emailLog.count({
          where: {
            tenantId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.template.count({
          where: {
            tenantId,
            type: 'CUSTOM',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.campaign.count({
          where: {
            tenantId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

      // Define pricing (in cents)
      const pricing = {
        emailOverage: 0.1, // $0.001 per email over limit
        additionalTemplate: 5, // $0.05 per additional template
        campaignFee: 10, // $0.10 per campaign
      };

      const charges = {
        emailOverage: 0,
        additionalTemplates: templatesCreated * pricing.additionalTemplate,
        campaignFees: campaignsLaunched * pricing.campaignFee,
      };

      const totalCharges = Object.values(charges).reduce((sum, charge) => sum + charge, 0);

      return {
        period: {
          start: startDate,
          end: endDate,
        },
        usage: {
          emailsSent,
          templatesCreated,
          campaignsLaunched,
        },
        charges,
        totalCharges,
        currency: 'usd',
      };
    } catch (error) {
      logger.error('Calculate usage charges error:', error);
      throw error;
    }
  }

  /**
   * Generate usage report for billing period
   */
  async generateUsageReport(tenantId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const [
        tenant,
        emailLogs,
        campaigns,
        templates,
      ] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            organizationName: true,
            subscriptionPlan: true,
            monthlyEmailLimit: true,
            customTemplateLimit: true,
          },
        }),
        prisma.emailLog.groupBy({
          by: ['status'],
          where: {
            tenantId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: {
            id: true,
          },
        }),
        prisma.campaign.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            name: true,
            status: true,
            totalRecipients: true,
            successful: true,
            failed: true,
            createdAt: true,
          },
        }),
        prisma.template.count({
          where: {
            tenantId,
            type: 'CUSTOM',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

      const emailStats = emailLogs.reduce((acc, log) => {
        acc[log.status.toLowerCase()] = log._count.id;
        return acc;
      }, {});

      const totalEmails = Object.values(emailStats).reduce((sum, count) => sum + count, 0);

      return {
        tenant: {
          id: tenantId,
          name: tenant.organizationName,
          plan: tenant.subscriptionPlan,
        },
        period: {
          year,
          month,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        limits: {
          monthlyEmails: tenant.monthlyEmailLimit,
          customTemplates: tenant.customTemplateLimit,
        },
        usage: {
          totalEmails,
          emailsByStatus: emailStats,
          campaignsLaunched: campaigns.length,
          templatesCreated: templates,
          utilizationPercentage: (totalEmails / tenant.monthlyEmailLimit) * 100,
        },
        campaigns: campaigns.slice(0, 10), // Top 10 campaigns
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Generate usage report error:', error);
      throw error;
    }
  }

  /**
   * Track billable event
   */
  async trackBillableEvent(tenantId, eventType, eventData = {}) {
    try {
      await prisma.usageEvent.create({
        data: {
          tenantId,
          eventType,
          eventData,
          timestamp: new Date(),
        },
      });

      logger.info('Billable event tracked:', {
        tenantId,
        eventType,
        eventData,
      });
    } catch (error) {
      logger.error('Track billable event error:', error);
      // Don't throw error as this shouldn't break the main functionality
    }
  }

  /**
   * Get tenant billing summary
   */
  async getTenantBillingSummary(tenantId) {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const [
        tenant,
        monthlyUsage,
        billingHistory,
      ] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            monthlyEmailLimit: true,
            customTemplateLimit: true,
            subscriptionEndsAt: true,
          },
        }),
        prisma.emailLog.count({
          where: {
            tenantId,
            createdAt: { gte: currentMonth },
          },
        }),
        prisma.billingHistory.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      return {
        subscription: {
          plan: tenant.subscriptionPlan,
          status: tenant.subscriptionStatus,
          endsAt: tenant.subscriptionEndsAt,
        },
        limits: {
          monthlyEmails: tenant.monthlyEmailLimit,
          customTemplates: tenant.customTemplateLimit,
        },
        currentUsage: {
          emails: monthlyUsage,
          utilizationPercentage: (monthlyUsage / tenant.monthlyEmailLimit) * 100,
        },
        recentPayments: billingHistory,
      };
    } catch (error) {
      logger.error('Get tenant billing summary error:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();
