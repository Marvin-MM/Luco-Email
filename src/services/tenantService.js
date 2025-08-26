import { prisma } from '../config/database.js';
import { sesService } from './sesService.js';
import { logger } from '../utils/logger.js';

class TenantService {
  /**
   * Create a new tenant with SES configuration
   */
  async createTenant(organizationName, userId) {
    try {
      logger.info(`Creating tenant for organization: ${organizationName}`);

      // Create SES configuration set for tenant isolation
      const configurationSetName = `luco-${organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

      const tenant = await prisma.tenant.create({
        data: {
          organizationName,
          sesConfigurationSet: configurationSetName,
          status: 'PENDING_VERIFICATION',
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'ACTIVE',
          monthlyEmailLimit: 200,
          customTemplateLimit: 5,
          attachmentSizeLimit: 100,
          users: {
            connect: { id: userId }
          }
        },
        include: {
          users: true
        }
      });

      // Create SES configuration set
      try {
        await sesService.createConfigurationSet(configurationSetName, {
          tenantId: tenant.id,
          organizationName
        });

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: 'ACTIVE' }
        });

        logger.info(`Tenant created successfully: ${tenant.id}`);
      } catch (sesError) {
        logger.error('Failed to create SES configuration set:', sesError);
        // Don't fail tenant creation, just log the error
        // SES setup can be retried later
      }

      return tenant;
    } catch (error) {
      logger.error('Failed to create tenant:', error);
      throw new Error('Failed to create tenant');
    }
  }

  /**
   * Setup SES for a tenant
   */
  async setupTenantSES(tenantId, organizationName, configurationSetName) {
    try {
      await sesService.createConfigurationSet(configurationSetName, {
        tenantId: tenantId,
        organizationName: organizationName,
      });
  
      // If SES setup is successful, activate the tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'ACTIVE' },
      });
  
      logger.info(`SES configuration set created for tenant: ${tenantId}`);
      return true;
    } catch (sesError) {
      logger.error(`Failed to create SES configuration set for tenant ${tenantId}:`, sesError);
      // Do not throw an error, as this is a background task.
      // The tenant will remain in 'PENDING_VERIFICATION' state, which is correct.
      return false;
    }
  }

  /**
   * Get tenant by ID with relations
   */
  async getTenantById(tenantId, includeRelations = false) {
    try {
      const include = includeRelations ? {
        users: true,
        applications: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            applications: true,
            templates: true,
            emailLogs: true
          }
        }
      } : undefined;

      return await prisma.tenant.findUnique({
        where: { id: tenantId },
        include
      });
    } catch (error) {
      logger.error('Failed to get tenant:', error);
      throw new Error('Failed to get tenant');
    }
  }

  /**
   * Get tenant by organization name
   */
  async getTenantByOrganization(organizationName) {
    try {
      return await prisma.tenant.findUnique({
        where: { organizationName },
        include: {
          users: true
        }
      });
    } catch (error) {
      logger.error('Failed to get tenant by organization:', error);
      throw new Error('Failed to get tenant');
    }
  }

  /**
   * Update tenant subscription limits
   */
  async updateSubscriptionLimits(tenantId, plan) {
    const limits = this.getSubscriptionLimits(plan);

    try {
      return await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlan: plan,
          ...limits
        }
      });
    } catch (error) {
      logger.error('Failed to update subscription limits:', error);
      throw new Error('Failed to update subscription limits');
    }
  }

  /**
   * Get subscription limits for a tenant
   */
  async getSubscriptionLimits(tenantId) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return this.getSubscriptionPlanLimits(tenant.subscriptionPlan);
    } catch (error) {
      logger.error('Get subscription limits error:', error);
      throw error;
    }
  }

  /**
   * Get all active tenants
   */
  async getAllActiveTenants() {
    try {
      return await prisma.tenant.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          organizationName: true,
          subscriptionPlan: true,
          createdAt: true,
        },
      });
    } catch (error) {
      logger.error('Get all active tenants error:', error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(tenantId, settings) {
    try {
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...settings,
          updatedAt: new Date(),
        },
      });

      logger.info('Tenant settings updated', { tenantId, settings });
      return updatedTenant;
    } catch (error) {
      logger.error('Update tenant settings error:', error);
      throw error;
    }
  }

  /**
   * Deactivate tenant
   */
  async deactivateTenant(tenantId, reason = 'Manual deactivation') {
    try {
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isActive: false,
          deactivationReason: reason,
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Tenant deactivated', { tenantId, reason });
      return updatedTenant;
    } catch (error) {
      logger.error('Deactivate tenant error:', error);
      throw error;
    }
  }

  /**
   * Get tenant usage summary
   */
  async getTenantUsageSummary(tenantId) {
    try {
      const [emailCount, templateCount, campaignCount] = await Promise.all([
        prisma.emailLog.count({
          where: { tenantId },
        }),
        prisma.template.count({
          where: { tenantId, isActive: true },
        }),
        prisma.campaign.count({
          where: { tenantId },
        }),
      ]);

      return {
        totalEmails: emailCount,
        totalTemplates: templateCount,
        totalCampaigns: campaignCount,
      };
    } catch (error) {
      logger.error('Get tenant usage summary error:', error);
      throw error;
    }
  }

  /**
   * Get subscription limits based on plan
   */
  getSubscriptionPlanLimits(plan) {
    const limits = {
      FREE: {
        monthlyEmailLimit: 200,
        customTemplateLimit: 5,
        attachmentSizeLimit: 100
      },
      STANDARD: {
        monthlyEmailLimit: 2000,
        customTemplateLimit: 25,
        attachmentSizeLimit: 500
      },
      ESSENTIAL: {
        monthlyEmailLimit: 10000,
        customTemplateLimit: 100,
        attachmentSizeLimit: 1000
      },
      PREMIUM: {
        monthlyEmailLimit: 50000,
        customTemplateLimit: 500,
        attachmentSizeLimit: 2000
      }
    };

    return limits[plan] || limits.FREE;
  }

  /**
   * Check if tenant can send emails (within limits)
   */
  async canSendEmails(tenantId, emailCount = 1) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) return false;

      return (tenant.emailsSentThisMonth + emailCount) <= tenant.monthlyEmailLimit;
    } catch (error) {
      logger.error('Failed to check email limits:', error);
      return false;
    }
  }

  /**
   * Update tenant email usage
   */
  async updateEmailUsage(tenantId, emailCount) {
    try {
      return await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          emailsSentThisMonth: {
            increment: emailCount
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update email usage:', error);
      throw new Error('Failed to update email usage');
    }
  }

  /**
   * Reset monthly email usage (called by cron job)
   */
  async resetMonthlyUsage() {
    try {
      const result = await prisma.tenant.updateMany({
        data: {
          emailsSentThisMonth: 0
        }
      });

      logger.info(`Reset monthly usage for ${result.count} tenants`);
      return result;
    } catch (error) {
      logger.error('Failed to reset monthly usage:', error);
      throw new Error('Failed to reset monthly usage');
    }
  }
}

export const tenantService = new TenantService();