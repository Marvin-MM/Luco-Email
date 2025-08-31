import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { analyticsService } from '../services/analyticsService.js';
import { billingService } from '../services/billingService.js';
import { systemService } from '../services/systemService.js';
import { emailQueueService } from '../services/emailQueueService.js';

/**
 * Get tenant dashboard analytics
 */
export const getTenantDashboard = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get overview metrics
    const [
      totalEmailsSent,
      totalCampaigns,
      activeApplications,
      verifiedIdentities,
      recentEmailLogs,
      campaignStats,
      emailDeliveryStats,
      monthlyUsage,
    ] = await Promise.all([
      // Total emails sent in period
      prisma.emailLog.count({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      }),

      // Total campaigns in period
      prisma.campaign.count({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Active applications
      prisma.application.count({
        where: tenantId && { tenantId, isActive: true },
      }),

      // Verified identities
      prisma.identity.count({
        where: tenantId && { tenantId, status: 'VERIFIED' },
      }),

      // Recent email activity
      prisma.emailLog.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),

      // Campaign performance
      prisma.campaign.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: ['SENT', 'SENDING'] },
        },
        select: {
          id: true,
          name: true,
          totalRecipients: true,
          successful: true,
          failed: true,
          status: true,
          sentAt: true,
        },
      }),

      // Email delivery statistics
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

      // Monthly usage for current month
      prisma.emailLog.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Calculate delivery rates
    const totalSent = recentEmailLogs.length;
    const delivered = recentEmailLogs.filter(log => log.status === 'DELIVERED').length;
    const bounced = recentEmailLogs.filter(log => log.status === 'BOUNCED').length;
    const complained = recentEmailLogs.filter(log => log.status === 'COMPLAINED').length;

    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
    const complaintRate = totalSent > 0 ? (complained / totalSent) * 100 : 0;

    // Generate daily email volume for chart
    const dailyVolume = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayEmails = recentEmailLogs.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate >= dayStart && logDate < dayEnd;
      }).length;

      dailyVolume.push({
        date: currentDate.toISOString().split('T')[0],
        count: dayEmails,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionPlan: true,
        monthlyEmailLimit: true,
        customTemplateLimit: true,
      },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalEmailsSent,
          totalCampaigns,
          activeApplications,
          verifiedIdentities,
          monthlyUsage,
          monthlyLimit: tenant.monthlyEmailLimit,
          usagePercentage: (monthlyUsage / tenant.monthlyEmailLimit) * 100,
        },
        performance: {
          deliveryRate: parseFloat(deliveryRate.toFixed(2)),
          bounceRate: parseFloat(bounceRate.toFixed(2)),
          complaintRate: parseFloat(complaintRate.toFixed(2)),
        },
        emailStats: emailDeliveryStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count.id;
          return acc;
        }, {}),
        dailyVolume,
        recentCampaigns: campaignStats.slice(0, 5),
        period,
      },
    });
  } catch (error) {
    logger.error('Get tenant dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
    });
  }
};

/**
 * Get detailed email analytics
 */
export const getEmailAnalytics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      period = '30d',
      applicationId,
      identityId,
      templateId,
      granularity = 'daily',
    } = req.query;

    const endDate = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const whereClause = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...(applicationId && { applicationId }),
      ...(identityId && { identityId }),
      ...(templateId && { templateId }),
    };

    const emailsByStatus = await prisma.emailLog.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true },
    });

    const safeGranularity = { hourly: 'hour', daily: 'day', weekly: 'week' }[granularity] || 'day';
    const params = [tenantId, startDate, endDate];
    let query = `
      SELECT DATE_TRUNC('${safeGranularity}', "createdAt") as period, status, COUNT(*) as count
      FROM email_logs 
      WHERE "tenantId" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3`;

    if (applicationId) {
      params.push(applicationId);
      query += ` AND "applicationId" = $${params.length}`;
    }
    if (identityId) {
      params.push(identityId);
      query += ` AND "identityId" = $${params.length}`;
    }
    if (templateId) {
      params.push(templateId);
      query += ` AND "templateId" = $${params.length}`;
    }
    query += ` GROUP BY period, status ORDER BY period ASC`;
    const timeSeriesData = await prisma.$queryRawUnsafe(query, ...params);
    
    // --- THIS IS THE FIX ---
    const processedTimeSeries = timeSeriesData.map(item => ({
      ...item,
      count: Number(item.count),
    }));
    // --- END OF FIX ---

    const topTemplates = await prisma.emailLog.groupBy({
      by: ['templateId'],
      where: { ...whereClause, templateId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get template details
    const templateDetails = await Promise.all(
      topTemplates.map(async (template) => {
        const templateInfo = await prisma.template.findUnique({
          where: { id: template.templateId },
          select: { id: true, name: true, subject: true },
        });

        const deliveryStats = await prisma.emailLog.groupBy({
          by: ['status'],
          where: {
            ...whereClause,
            templateId: template.templateId,
          },
          _count: {
            id: true,
          },
        });

        const totalSent = template._count.id;
        const delivered = deliveryStats.find(s => s.status === 'DELIVERED')?._count.id || 0;
        const bounced = deliveryStats.find(s => s.status === 'BOUNCED')?._count.id || 0;

        return {
          ...templateInfo,
          totalSent,
          deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
          bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
        };
      })
    );

    // Get bounce and complaint details
    const bounceReasons = await prisma.emailLog.groupBy({
      by: ['bounceReason'],
      where: {
        ...whereClause,
        status: 'BOUNCED',
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
    });

    const complaintReasons = await prisma.emailLog.groupBy({
      by: ['complaintReason'],
      where: {
        ...whereClause,
        status: 'COMPLAINED',
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
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalEmails: emailsByStatus.reduce((sum, status) => sum + status._count.id, 0),
          byStatus: emailsByStatus.reduce((acc, status) => {
            acc[status.status.toLowerCase()] = status._count.id;
            return acc;
          }, {}),
        },
        timeSeries: processedTimeSeries, // Use the fixed data
        topTemplates: templateDetails,
        issueAnalysis: {
          bounceReasons: bounceReasons.map(reason => ({
            reason: reason.bounceReason,
            count: reason._count.id,
          })),
          complaintReasons: complaintReasons.map(reason => ({
            reason: reason.complaintReason,
            count: reason._count.id,
          })),
        },
        filters: { period, applicationId, identityId, templateId, granularity },
      },
    });
  } catch (error) {
    logger.error('Get email analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email analytics',
    });
  }
};

/**
 * Get campaign performance analytics
 */
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = '30d', status, applicationId } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const whereClause = {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(status && { status }),
      ...(applicationId && { applicationId }),
    };

    // Get campaign statistics
    const [campaigns, campaignsByStatus, averageMetrics] = await Promise.all([
      // All campaigns with basic stats
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          application: {
            select: { id: true, name: true },
          },
          template: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              emailLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Campaigns grouped by status
      prisma.campaign.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          id: true,
        },
      }),

      // Average metrics
      prisma.campaign.aggregate({
        where: {
          ...whereClause,
          status: 'SENT',
        },
        _avg: {
          totalRecipients: true,
          successful: true,
          failed: true,
        },
      }),
    ]);

    // Calculate detailed performance metrics for each campaign
    const campaignPerformance = await Promise.all(
      campaigns.map(async (campaign) => {
        const emailStats = await prisma.emailLog.groupBy({
          by: ['status'],
          where: {
            campaignId: campaign.id,
          },
          _count: {
            id: true,
          },
        });

        const totalSent = emailStats.reduce((sum, stat) => sum + stat._count.id, 0);
        const delivered = emailStats.find(s => s.status === 'DELIVERED')?._count.id || 0;
        const bounced = emailStats.find(s => s.status === 'BOUNCED')?._count.id || 0;
        const complained = emailStats.find(s => s.status === 'COMPLAINED')?._count.id || 0;
        const opened = await prisma.emailLog.count({
          where: {
            campaignId: campaign.id,
            openedAt: { not: null },
          },
        });
        const clicked = await prisma.emailLog.count({
          where: {
            campaignId: campaign.id,
            clickedAt: { not: null },
          },
        });

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          application: campaign.application,
          template: campaign.template,
          createdAt: campaign.createdAt,
          sentAt: campaign.sentAt,
          totalRecipients: campaign.totalRecipients,
          metrics: {
            totalSent,
            delivered,
            bounced,
            complained,
            opened,
            clicked,
            deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
            bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
            complaintRate: totalSent > 0 ? (complained / totalSent) * 100 : 0,
            openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
            clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
          },
        };
      })
    );

    // Get top performing campaigns
    const topCampaigns = campaignPerformance
      .filter(c => c.status === 'SENT')
      .sort((a, b) => b.metrics.deliveryRate - a.metrics.deliveryRate)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: {
          totalCampaigns: campaigns.length,
          byStatus: campaignsByStatus.reduce((acc, status) => {
            acc[status.status.toLowerCase()] = status._count.id;
            return acc;
          }, {}),
          averageMetrics: {
            avgRecipients: Math.round(averageMetrics._avg.totalRecipients || 0),
            avgSuccessful: Math.round(averageMetrics._avg.successful || 0),
            avgFailed: Math.round(averageMetrics._avg.failed || 0),
          },
        },
        campaigns: campaignPerformance,
        topCampaigns,
        filters: {
          period,
          status,
          applicationId,
        },
      },
    });
  } catch (error) {
    logger.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign analytics',
    });
  }
};

/**
 * Get system health and performance metrics
 */
export const getSystemMetrics = async (req, res) => {
  try {
    const { tenantId, userRole } = req.user;

    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    // System-wide metrics for superadmin
    const metrics = await systemService.getSystemMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics',
    });
  }
};

/**
 * Generate time series data for charts
 */
export const getTimeSeries = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate, granularity = 'daily', metric = 'count' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const timeSeries = await analyticsService.generateTimeSeries(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      granularity,
      metric
    );

    res.json({
      success: true,
      data: timeSeries,
    });
  } catch (error) {
    logger.error('Get time series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate time series data',
    });
  }
};

/**
 * Get top performing content
 */
export const getTopPerformingContent = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { contentType = 'templates', limit = 10 } = req.query;

    const topContent = await analyticsService.getTopPerformingContent(
      tenantId,
      contentType,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topContent,
    });
  } catch (error) {
    logger.error('Get top performing content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performing content',
    });
  }
};

/**
 * Generate reputation report
 */
export const getReputationReport = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const reputationReport = await analyticsService.generateReputationReport(tenantId);

    res.json({
      success: true,
      data: reputationReport,
    });
  } catch (error) {
    logger.error('Get reputation report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reputation report',
    });
  }
};

/**
 * Calculate tenant usage statistics
 */
export const getTenantUsageStats = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = 'current_month' } = req.query;

    const usageStats = await analyticsService.calculateTenantUsage(tenantId, period);

    res.json({
      success: true,
      data: usageStats,
    });
  } catch (error) {
    logger.error('Get tenant usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant usage statistics',
    });
  }
};

/**
 * Export analytics data
 */
export const exportAnalytics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { type, period = '30d', format = 'json' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    let data = {};

    switch (type) {
      case 'emails':
        data = await prisma.emailLog.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            campaign: {
              select: { id: true, name: true },
            },
            application: {
              select: { id: true, name: true },
            },
            template: {
              select: { id: true, name: true },
            },
            identity: {
              select: { id: true, value: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        break;

      case 'campaigns':
        data = await prisma.campaign.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            application: {
              select: { id: true, name: true },
            },
            template: {
              select: { id: true, name: true },
            },
            identity: {
              select: { id: true, value: true },
            },
            _count: {
              select: {
                recipients: true,
                emailLogs: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Use "emails" or "campaigns"',
        });
    }

    // Set appropriate headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `luco-${type}-export-${timestamp}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');

    if (format === 'json') {
      res.json({
        success: true,
        exportInfo: {
          type,
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          recordCount: data.length,
          exportedAt: new Date().toISOString(),
        },
        data,
      });
    } else {
      // CSV format would require additional processing
      res.status(400).json({
        success: false,
        message: 'CSV export not yet implemented',
      });
    }
  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
    });
  }
};

// --- Billing Service Integration ---

/**
 * Check email sending limit for a tenant.
 */
export const checkEmailLimit = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { emailsSent } = req.body;

    if (emailsSent === undefined) {
      return res.status(400).json({ success: false, message: 'emailsSent is required.' });
    }

    const canSend = await billingService.checkEmailLimit(tenantId, emailsSent);

    res.json({ success: true, data: { canSend } });
  } catch (error) {
    logger.error('Check email limit error:', error);
    res.status(500).json({ success: false, message: 'Failed to check email limit.' });
  }
};

/**
 * Check template usage limit for a tenant.
 */
export const checkTemplateLimit = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { templatesUsed } = req.body;

    if (templatesUsed === undefined) {
      return res.status(400).json({ success: false, message: 'templatesUsed is required.' });
    }

    const canUse = await billingService.checkTemplateLimit(tenantId, templatesUsed);

    res.json({ success: true, data: { canUse } });
  } catch (error) {
    logger.error('Check template limit error:', error);
    res.status(500).json({ success: false, message: 'Failed to check template limit.' });
  }
};

/**
 * Get all billing details for a tenant.
 */
export const getTenantBilling = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const billingDetails = await billingService.getTenantBilling(tenantId);
    res.json({ success: true, data: billingDetails });
  } catch (error) {
    logger.error('Get tenant billing error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tenant billing details.' });
  }
};

/**
 * Update tenant's subscription plan.
 */
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required.' });
    }

    await billingService.updateSubscriptionPlan(tenantId, planId);
    res.json({ success: true, message: 'Subscription plan updated successfully.' });
  } catch (error) {
    logger.error('Update subscription plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to update subscription plan.' });
  }
};

/**
 * Get all available subscription plans.
 */
export const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await billingService.getAllSubscriptionPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    logger.error('Get all subscription plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription plans.' });
  }
};

/**
 * Get invoice history for a tenant.
 */
export const getInvoiceHistory = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const invoices = await billingService.getInvoiceHistory(tenantId);
    res.json({ success: true, data: invoices });
  } catch (error) {
    logger.error('Get invoice history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get invoice history.' });
  }
};

/**
 * Get a specific invoice by ID.
 */
export const getInvoiceById = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'invoiceId is required.' });
    }

    const invoice = await billingService.getInvoiceById(tenantId, invoiceId);
    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Get invoice by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to get invoice.' });
  }
};

/**
 * Create a new invoice for a tenant (e.g., for custom plans).
 */
export const createInvoice = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const invoiceData = req.body;

    if (!invoiceData) {
      return res.status(400).json({ success: false, message: 'Invoice data is required.' });
    }

    const newInvoice = await billingService.createInvoice(tenantId, invoiceData);
    res.status(201).json({ success: true, data: newInvoice });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to create invoice.' });
  }
};


// --- System Service Integration ---

/**
 * Get system status and configuration.
 */
export const getSystemStatus = async (req, res) => {
  try {
    const status = await systemService.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Get system status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get system status.' });
  }
};

/**
 * Update system configuration.
 */
export const updateSystemConfiguration = async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, message: 'Configuration data is required.' });
    }
    await systemService.updateSystemConfiguration(config);
    res.json({ success: true, message: 'System configuration updated successfully.' });
  } catch (error) {
    logger.error('Update system configuration error:', error);
    res.status(500).json({ success: false, message: 'Failed to update system configuration.' });
  }
};

/**
 * Get all system logs.
 */
export const getSystemLogs = async (req, res) => {
  try {
    const { limit = 100, level } = req.query;
    const logs = await systemService.getSystemLogs(parseInt(limit), level);
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Get system logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get system logs.' });
  }
};

/**
 * Clear system logs.
 */
export const clearSystemLogs = async (req, res) => {
  try {
    await systemService.clearSystemLogs();
    res.json({ success: true, message: 'System logs cleared successfully.' });
  } catch (error) {
    logger.error('Clear system logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear system logs.' });
  }
};

/**
 * Get available system modules.
 */
export const getSystemModules = async (req, res) => {
  try {
    const modules = await systemService.getSystemModules();
    res.json({ success: true, data: modules });
  } catch (error) {
    logger.error('Get system modules error:', error);
    res.status(500).json({ success: false, message: 'Failed to get system modules.' });
  }
};

/**
 * Enable or disable a system module.
 */
export const toggleSystemModule = async (req, res) => {
  try {
    const { moduleName, enabled } = req.body;
    if (!moduleName || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'moduleName and enabled status are required.' });
    }
    await systemService.toggleSystemModule(moduleName, enabled);
    res.json({ success: true, message: `${moduleName} module ${enabled ? 'enabled' : 'disabled'} successfully.` });
  } catch (error) {
    logger.error('Toggle system module error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle system module.' });
  }
};

// --- Email Queue Service Integration ---

/**
 * Get email queue statistics.
 */
export const getQueueStats = async (req, res) => {
  try {
    const stats = await emailQueueService.getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Get queue stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get queue statistics.' });
  }
};

/**
 * Clear the email queue.
 */
export const clearQueue = async (req, res) => {
  try {
    await emailQueueService.clearQueue();
    res.json({ success: true, message: 'Email queue cleared successfully.' });
  } catch (error) {
    logger.error('Clear queue error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear email queue.' });
  }
};

/**
 * Retry failed jobs in the email queue.
 */
export const retryFailedJobs = async (req, res) => {
  try {
    await emailQueueService.retryFailedJobs();
    res.json({ success: true, message: 'Failed jobs retried successfully.' });
  } catch (error) {
    logger.error('Retry failed jobs error:', error);
    res.status(500).json({ success: false, message: 'Failed to retry failed jobs.' });
  }
};