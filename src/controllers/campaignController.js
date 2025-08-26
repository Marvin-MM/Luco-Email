import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { templateService } from '../services/templateService.js';
import { emailQueueService } from '../services/emailQueueService.js';
import { sesService } from '../services/sesService.js';
import { tenantService } from '../services/tenantService.js';
import { billingService } from '../services/billingService.js';

/**
 * Create a new email campaign
 */
export const createCampaign = async (req, res) => {
  try {
    const {
      name,
      applicationId,
      templateId,
      identityId,
      subject,
      scheduledAt,
      recipients,
      variables = {},
      settings = {}
    } = req.body;
    const { tenantId } = req.user;

    // Validate required fields
    if (!name || !applicationId || !templateId || !identityId || !recipients?.length) {
      return res.status(400).json({
        success: false,
        message: 'Name, application, template, identity, and recipients are required',
      });
    }

    // Check email sending limits
    const emailLimit = await billingService.checkEmailLimit(tenantId, recipients.length);
    if (!emailLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: emailLimit.reason,
        data: {
          remaining: emailLimit.remaining,
          limit: emailLimit.limit,
          used: emailLimit.used,
        },
      });
    }

    // Validate that user has access to the application, template, and identity
    const [application, template, identity] = await Promise.all([
      prisma.application.findFirst({
        where: { id: applicationId, tenantId },
      }),
      prisma.template.findFirst({
        where: {
          id: templateId,
          applicationId,
          tenantId,
          isActive: true,
        },
      }),
      prisma.identity.findFirst({
        where: {
          id: identityId,
          tenantId,
          status: 'VERIFIED',
        },
      }),
    ]);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or inactive',
      });
    }

    if (!identity) {
      return res.status(404).json({
        success: false,
        message: 'Verified identity not found',
      });
    }

    // Check tenant email limits
    const tenant = await tenantService.getTenantById(tenantId);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyEmailCount = await prisma.emailLog.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(currentYear, currentMonth, 1),
          lt: new Date(currentYear, currentMonth + 1, 1),
        },
      },
    });

    if (monthlyEmailCount + recipients.length > tenant.monthlyEmailLimit) {
      return res.status(403).json({
        success: false,
        message: `Monthly email limit exceeded. Limit: ${tenant.monthlyEmailLimit}, Used: ${monthlyEmailCount}, Requested: ${recipients.length}`,
        data: {
          monthlyLimit: tenant.monthlyEmailLimit,
          currentUsage: monthlyEmailCount,
          requestedEmails: recipients.length,
          remaining: tenant.monthlyEmailLimit - monthlyEmailCount,
        },
      });
    }

    // Validate recipients format
    const validatedRecipients = [];
    const invalidRecipients = [];

    recipients.forEach((recipient, index) => {
      if (typeof recipient === 'string') {
        // Simple email string
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(recipient)) {
          validatedRecipients.push({
            email: recipient.toLowerCase(),
            variables: {},
          });
        } else {
          invalidRecipients.push({ index, email: recipient, error: 'Invalid email format' });
        }
      } else if (recipient.email) {
        // Object with email and variables
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(recipient.email)) {
          validatedRecipients.push({
            email: recipient.email.toLowerCase(),
            variables: recipient.variables || {},
          });
        } else {
          invalidRecipients.push({ index, email: recipient.email, error: 'Invalid email format' });
        }
      } else {
        invalidRecipients.push({ index, email: recipient, error: 'Missing email field' });
      }
    });

    if (invalidRecipients.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipients found',
        data: {
          invalidRecipients: invalidRecipients.slice(0, 10), // Limit to first 10 for readability
          totalInvalid: invalidRecipients.length,
          totalValid: validatedRecipients.length,
        },
      });
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject: subject || template.subject,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        totalRecipients: validatedRecipients.length,
        variables: variables,
        settings: settings,
        applicationId,
        templateId,
        identityId,
        tenantId,
        userId: req.user.id,
      },
      include: {
        application: {
          select: { id: true, name: true },
        },
        template: {
          select: { id: true, name: true },
        },
        identity: {
          select: { id: true, value: true, type: true },
        },
      },
    });

    // Create campaign recipients
    const recipientData = validatedRecipients.map(recipient => ({
      campaignId: campaign.id,
      email: recipient.email,
      variables: recipient.variables,
      status: 'PENDING',
    }));

    // Create recipients in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < recipientData.length; i += batchSize) {
      const batch = recipientData.slice(i, i + batchSize);
      await prisma.campaignRecipient.createMany({
        data: batch,
      });
    }

    logger.info('Campaign created successfully', {
      campaignId: campaign.id,
      name: campaign.name,
      recipientCount: validatedRecipients.length,
      tenantId,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: {
        campaign: {
          ...campaign,
          recipientCount: validatedRecipients.length,
        },
      },
    });
  } catch (error) {
    logger.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
    });
  }
};

/**
 * Get campaigns for a tenant
 */
export const getCampaigns = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      applicationId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(applicationId && { applicationId }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          application: {
            select: { id: true, name: true },
          },
          template: {
            select: { id: true, name: true },
          },
          identity: {
            select: { id: true, value: true, type: true },
          },
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: {
            select: {
              recipients: true,
              emailLogs: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
    });
  }
};

/**
 * Get campaign by ID
 */
export const getCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId } = req.user;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
      include: {
        application: {
          select: { id: true, name: true },
        },
        template: {
          select: { id: true, name: true, subject: true, htmlContent: true },
        },
        identity: {
          select: { id: true, value: true, type: true },
        },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: {
          select: {
            recipients: true,
            emailLogs: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    // Get campaign statistics
    const stats = await getCampaignStats(campaignId);

    res.json({
      success: true,
      data: {
        campaign: {
          ...campaign,
          stats,
        },
      },
    });
  } catch (error) {
    logger.error('Get campaign by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
    });
  }
};

/**
 * Send campaign (start processing)
 */
export const sendCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId } = req.user;
    const { batchSize = 100, delayBetweenBatches = 5000 } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
      include: {
        application: true,
        template: true,
        identity: true,
        tenant: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot send campaign with status: ${campaign.status}`,
      });
    }

    // Update campaign status to SENDING
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        sentAt: new Date(),
      },
    });

    // Queue campaign for processing
    await emailQueueService.queueCampaign(campaign, {
      batchSize: parseInt(batchSize),
      delayBetweenBatches: parseInt(delayBetweenBatches),
    });

    logger.info('Campaign queued for sending', {
      campaignId,
      campaignName: campaign.name,
      tenantId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Campaign queued for sending',
      data: {
        campaignId,
        status: 'SENDING',
        queuedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign',
    });
  }
};

/**
 * Cancel campaign
 */
export const cancelCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId } = req.user;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    if (!['SCHEDULED', 'SENDING'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel campaign with status: ${campaign.status}`,
      });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Cancel queued jobs
    await emailQueueService.cancelCampaign(campaignId);

    logger.info('Campaign cancelled', {
      campaignId,
      tenantId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Campaign cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel campaign',
    });
  }
};

/**
 * Get campaign statistics
 */
export const getCampaignStats = async (campaignId) => {
  try {
    const [
      totalSent,
      delivered,
      bounced,
      complained,
      opened,
      clicked,
      pending,
      failed,
    ] = await Promise.all([
      prisma.emailLog.count({
        where: { campaignId, status: { not: 'PENDING' } },
      }),
      prisma.emailLog.count({
        where: { campaignId, status: 'DELIVERED' },
      }),
      prisma.emailLog.count({
        where: { campaignId, status: 'BOUNCED' },
      }),
      prisma.emailLog.count({
        where: { campaignId, status: 'COMPLAINED' },
      }),
      prisma.emailLog.count({
        where: { campaignId, openedAt: { not: null } },
      }),
      prisma.emailLog.count({
        where: { campaignId, clickedAt: { not: null } },
      }),
      prisma.campaignRecipient.count({
        where: { campaignId, status: 'PENDING' },
      }),
      prisma.emailLog.count({
        where: { campaignId, status: 'FAILED' },
      }),
    ]);

    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
    const complaintRate = totalSent > 0 ? (complained / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;

    return {
      counts: {
        totalSent,
        delivered,
        bounced,
        complained,
        opened,
        clicked,
        pending,
        failed,
      },
      rates: {
        delivery: parseFloat(deliveryRate.toFixed(2)),
        bounce: parseFloat(bounceRate.toFixed(2)),
        complaint: parseFloat(complaintRate.toFixed(2)),
        open: parseFloat(openRate.toFixed(2)),
        click: parseFloat(clickRate.toFixed(2)),
      },
    };
  } catch (error) {
    logger.error('Get campaign stats error:', error);
    throw error;
  }
};

/**
 * Get campaign analytics
 */
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId } = req.user;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const stats = await getCampaignStats(campaignId);

    // Get delivery timeline (daily aggregation)
    const timeline = await prisma.emailLog.groupBy({
      by: ['createdAt'],
      where: { campaignId },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get bounce/complaint details
    const issues = await prisma.emailLog.findMany({
      where: {
        campaignId,
        status: { in: ['BOUNCED', 'COMPLAINED'] },
      },
      select: {
        id: true,
        recipientEmail: true,
        status: true,
        bounceReason: true,
        complaintReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent issues
    });

    res.json({
      success: true,
      data: {
        campaignId,
        stats,
        timeline: timeline.map(item => ({
          date: item.createdAt.toISOString().split('T')[0],
          count: item._count.id,
        })),
        issues,
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
 * Delete campaign
 */
export const deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId } = req.user;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
      include: {
        _count: {
          select: {
            emailLogs: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    if (['SENDING'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign that is currently sending',
      });
    }

    // For campaigns with email history, mark as deleted instead of hard delete
    if (campaign._count.emailLogs > 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });
    } else {
      // Hard delete campaigns without email history
      await prisma.campaign.delete({
        where: { id: campaignId },
      });
    }

    logger.info('Campaign deleted', {
      campaignId,
      campaignName: campaign.name,
      tenantId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    logger.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
    });
  }
};