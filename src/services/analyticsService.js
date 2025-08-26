
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

class AnalyticsService {
  /**
   * Calculate email performance metrics
   */
  async calculateEmailMetrics(tenantId, filters = {}) {
    try {
      const whereClause = {
        tenantId,
        ...filters,
      };

      const [
        totalEmails,
        deliveredEmails,
        bouncedEmails,
        complainedEmails,
        failedEmails,
        openedEmails,
        clickedEmails,
      ] = await Promise.all([
        prisma.emailLog.count({ where: whereClause }),
        prisma.emailLog.count({ where: { ...whereClause, status: 'DELIVERED' } }),
        prisma.emailLog.count({ where: { ...whereClause, status: 'BOUNCED' } }),
        prisma.emailLog.count({ where: { ...whereClause, status: 'COMPLAINED' } }),
        prisma.emailLog.count({ where: { ...whereClause, status: 'FAILED' } }),
        prisma.emailLog.count({ where: { ...whereClause, openedAt: { not: null } } }),
        prisma.emailLog.count({ where: { ...whereClause, clickedAt: { not: null } } }),
      ]);

      const deliveryRate = totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0;
      const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;
      const complaintRate = totalEmails > 0 ? (complainedEmails / totalEmails) * 100 : 0;
      const failureRate = totalEmails > 0 ? (failedEmails / totalEmails) * 100 : 0;
      const openRate = deliveredEmails > 0 ? (openedEmails / deliveredEmails) * 100 : 0;
      const clickRate = deliveredEmails > 0 ? (clickedEmails / deliveredEmails) * 100 : 0;

      return {
        counts: {
          total: totalEmails,
          delivered: deliveredEmails,
          bounced: bouncedEmails,
          complained: complainedEmails,
          failed: failedEmails,
          opened: openedEmails,
          clicked: clickedEmails,
        },
        rates: {
          delivery: parseFloat(deliveryRate.toFixed(2)),
          bounce: parseFloat(bounceRate.toFixed(2)),
          complaint: parseFloat(complaintRate.toFixed(2)),
          failure: parseFloat(failureRate.toFixed(2)),
          open: parseFloat(openRate.toFixed(2)),
          click: parseFloat(clickRate.toFixed(2)),
        },
      };
    } catch (error) {
      logger.error('Calculate email metrics error:', error);
      throw error;
    }
  }

  /**
   * Generate time-series data for charts
   */
  async generateTimeSeries(tenantId, startDate, endDate, granularity = 'daily', metric = 'count') {
    try {
      const truncFunction = granularity === 'hourly' ? 'hour' : 'day';
      
      const rawData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${truncFunction}, created_at) as period,
          status,
          COUNT(*) as count
        FROM email_logs 
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY period, status
        ORDER BY period ASC
      `;

      // Process data into chart-friendly format
      const processedData = {};
      
      rawData.forEach(row => {
        const periodKey = row.period.toISOString();
        if (!processedData[periodKey]) {
          processedData[periodKey] = {
            period: periodKey,
            total: 0,
            delivered: 0,
            bounced: 0,
            complained: 0,
            failed: 0,
          };
        }
        
        processedData[periodKey][row.status.toLowerCase()] = parseInt(row.count);
        processedData[periodKey].total += parseInt(row.count);
      });

      return Object.values(processedData).sort((a, b) => 
        new Date(a.period) - new Date(b.period)
      );
    } catch (error) {
      logger.error('Generate time series error:', error);
      throw error;
    }
  }

  /**
   * Calculate tenant usage statistics
   */
  async calculateTenantUsage(tenantId, period = 'current_month') {
    try {
      let startDate, endDate;
      
      if (period === 'current_month') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        // Handle other periods as needed
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDate = new Date();
      }

      const [
        emailsSent,
        campaignsCreated,
        templatesUsed,
        identitiesVerified,
        tenant,
      ] = await Promise.all([
        prisma.emailLog.count({
          where: {
            tenantId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.campaign.count({
          where: {
            tenantId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.template.count({
          where: {
            tenantId,
            type: 'CUSTOM',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.identity.count({
          where: {
            tenantId,
            status: 'VERIFIED',
          },
        }),
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            monthlyEmailLimit: true,
            customTemplateLimit: true,
            subscriptionPlan: true,
          },
        }),
      ]);

      return {
        usage: {
          emailsSent,
          campaignsCreated,
          templatesUsed,
          identitiesVerified,
        },
        limits: {
          monthlyEmails: tenant.monthlyEmailLimit,
          customTemplates: tenant.customTemplateLimit,
        },
        utilization: {
          emails: (emailsSent / tenant.monthlyEmailLimit) * 100,
          templates: (templatesUsed / tenant.customTemplateLimit) * 100,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: period,
        },
      };
    } catch (error) {
      logger.error('Calculate tenant usage error:', error);
      throw error;
    }
  }

  /**
   * Get top performing content
   */
  async getTopPerformingContent(tenantId, contentType = 'templates', limit = 10) {
    try {
      switch (contentType) {
        case 'templates':
          const templates = await prisma.template.findMany({
            where: { tenantId },
            include: {
              _count: {
                select: {
                  emailLogs: true,
                },
              },
            },
            orderBy: {
              emailLogs: {
                _count: 'desc',
              },
            },
            take: limit,
          });

          // Calculate performance metrics for each template
          const templatePerformance = await Promise.all(
            templates.map(async (template) => {
              const metrics = await this.calculateEmailMetrics(tenantId, {
                templateId: template.id,
              });

              return {
                id: template.id,
                name: template.name,
                subject: template.subject,
                totalUsage: template._count.emailLogs,
                metrics,
              };
            })
          );

          return templatePerformance;

        case 'campaigns':
          const campaigns = await prisma.campaign.findMany({
            where: {
              tenantId,
              status: 'SENT',
            },
            include: {
              _count: {
                select: {
                  emailLogs: true,
                },
              },
            },
            orderBy: {
              successful: 'desc',
            },
            take: limit,
          });

          return campaigns.map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            totalRecipients: campaign.totalRecipients,
            successful: campaign.successful,
            failed: campaign.failed,
            successRate: campaign.totalRecipients > 0 
              ? (campaign.successful / campaign.totalRecipients) * 100 
              : 0,
            sentAt: campaign.sentAt,
          }));

        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      logger.error('Get top performing content error:', error);
      throw error;
    }
  }

  /**
   * Generate reputation report
   */
  async generateReputationReport(tenantId) {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        recentEmails,
        bouncesByReason,
        complaintsByReason,
        identityReputations,
      ] = await Promise.all([
        // Recent email statistics
        this.calculateEmailMetrics(tenantId, {
          createdAt: { gte: last30Days },
        }),

        // Bounce analysis
        prisma.emailLog.groupBy({
          by: ['bounceReason'],
          where: {
            tenantId,
            status: 'BOUNCED',
            createdAt: { gte: last30Days },
            bounceReason: { not: null },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        }),

        // Complaint analysis
        prisma.emailLog.groupBy({
          by: ['complaintReason'],
          where: {
            tenantId,
            status: 'COMPLAINED',
            createdAt: { gte: last30Days },
            complaintReason: { not: null },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        }),

        // Identity-specific metrics
        prisma.identity.findMany({
          where: {
            tenantId,
            status: 'VERIFIED',
          },
          select: {
            id: true,
            value: true,
            type: true,
            reputationMetrics: true,
          },
        }),
      ]);

      // Assess reputation health
      const { rates } = recentEmails;
      let reputationScore = 100;
      let riskLevel = 'LOW';
      const issues = [];

      if (rates.bounce > 5) {
        reputationScore -= (rates.bounce - 5) * 2;
        issues.push(`High bounce rate: ${rates.bounce}%`);
      }

      if (rates.complaint > 0.5) {
        reputationScore -= (rates.complaint - 0.5) * 10;
        issues.push(`High complaint rate: ${rates.complaint}%`);
      }

      if (reputationScore < 70) {
        riskLevel = 'HIGH';
      } else if (reputationScore < 85) {
        riskLevel = 'MEDIUM';
      }

      return {
        score: Math.max(0, Math.round(reputationScore)),
        riskLevel,
        issues,
        metrics: recentEmails,
        analysis: {
          bounceReasons: bouncesByReason.map(item => ({
            reason: item.bounceReason,
            count: item._count.id,
          })),
          complaintReasons: complaintsByReason.map(item => ({
            reason: item.complaintReason,
            count: item._count.id,
          })),
        },
        identities: identityReputations,
        recommendations: this.generateReputationRecommendations(rates, issues),
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Generate reputation report error:', error);
      throw error;
    }
  }

  /**
   * Generate reputation improvement recommendations
   */
  generateReputationRecommendations(rates, issues) {
    const recommendations = [];

    if (rates.bounce > 5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'List Management',
        action: 'Implement list cleaning to remove invalid email addresses',
        description: 'High bounce rates can damage sender reputation. Consider using email validation services.',
      });
    }

    if (rates.complaint > 0.5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Content Quality',
        action: 'Review email content and sending practices',
        description: 'High complaint rates indicate recipients find emails unwanted or irrelevant.',
      });
    }

    if (rates.open < 15) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Subject Lines',
        action: 'Optimize email subject lines for better engagement',
        description: 'Low open rates suggest subject lines may not be compelling enough.',
      });
    }

    if (rates.click < 2) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Content Design',
        action: 'Improve email content and call-to-action buttons',
        description: 'Low click rates indicate content may not be engaging or relevant.',
      });
    }

    return recommendations;
  }
}

export const analyticsService = new AnalyticsService();
