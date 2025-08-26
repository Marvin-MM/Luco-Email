
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { tenantService } from '../services/tenantService.js';

/**
 * Create a new application
 */
export const createApplication = async (req, res) => {
  try {
    const { name, description, settings } = req.body;
    const { tenantId } = req.user;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Application name is required',
      });
    }

    // Check if application name already exists for this tenant
    const existingApp = await prisma.application.findFirst({
      where: {
        name,
        tenantId,
      },
    });

    if (existingApp) {
      return res.status(409).json({
        success: false,
        message: 'Application with this name already exists',
      });
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        name,
        description,
        settings: settings || {},
        tenantId,
        userId: req.user.id,
      },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            identities: true,
            templates: true,
            emailLogs: true,
          },
        },
      },
    });

    logger.info('Application created successfully', {
      applicationId: application.id,
      name: application.name,
      tenantId,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Application created successfully',
      data: {
        application,
      },
    });
  } catch (error) {
    logger.error('Create application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create application',
    });
  }
};

/**
 * Get all applications for the tenant
 */
export const getApplications = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 10, search, status } = req.query;

    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { isActive: status === 'active' }),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          defaultIdentity: {
            select: {
              id: true,
              type: true,
              value: true,
              status: true,
            },
          },
          _count: {
            select: {
              identities: true,
              templates: true,
              emailLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
    });
  }
};

/**
 * Get application by ID
 */
export const getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { tenantId } = req.user;

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        identities: {
          select: {
            id: true,
            type: true,
            value: true,
            status: true,
            verifiedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        defaultIdentity: {
          select: {
            id: true,
            type: true,
            value: true,
            status: true,
          },
        },
        _count: {
          select: {
            templates: true,
            emailLogs: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    res.json({
      success: true,
      data: {
        application,
      },
    });
  } catch (error) {
    logger.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
    });
  }
};

/**
 * Update application
 */
export const updateApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { tenantId } = req.user;
    const { name, description, settings, isActive, defaultIdentityId } = req.body;

    // Check if application exists and belongs to tenant
    const existingApp = await prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
    });

    if (!existingApp) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // If updating name, check for duplicates
    if (name && name !== existingApp.name) {
      const duplicateApp = await prisma.application.findFirst({
        where: {
          name,
          tenantId,
          id: { not: applicationId },
        },
      });

      if (duplicateApp) {
        return res.status(409).json({
          success: false,
          message: 'Application with this name already exists',
        });
      }
    }

    // If setting default identity, verify it belongs to this application
    if (defaultIdentityId) {
      const identity = await prisma.identity.findFirst({
        where: {
          id: defaultIdentityId,
          applicationId,
          tenantId,
          status: 'VERIFIED',
        },
      });

      if (!identity) {
        return res.status(400).json({
          success: false,
          message: 'Invalid default identity. Identity must be verified and belong to this application.',
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (defaultIdentityId !== undefined) updateData.defaultIdentityId = defaultIdentityId;

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        defaultIdentity: {
          select: {
            id: true,
            type: true,
            value: true,
            status: true,
          },
        },
        _count: {
          select: {
            identities: true,
            templates: true,
            emailLogs: true,
          },
        },
      },
    });

    logger.info('Application updated successfully', {
      applicationId,
      tenantId,
      userId: req.user.id,
      changes: updateData,
    });

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: {
        application,
      },
    });
  } catch (error) {
    logger.error('Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application',
    });
  }
};

/**
 * Delete application
 */
export const deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { tenantId } = req.user;

    // Check if application exists and belongs to tenant
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
      include: {
        _count: {
          select: {
            emailLogs: true,
            templates: true,
            identities: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Check if application has sent emails (prevent accidental deletion)
    if (application._count.emailLogs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete application with email history. Deactivate instead.',
        data: {
          emailCount: application._count.emailLogs,
          suggestion: 'Set isActive to false to deactivate the application',
        },
      });
    }

    // Delete application (cascading deletes will handle related records)
    await prisma.application.delete({
      where: { id: applicationId },
    });

    logger.info('Application deleted successfully', {
      applicationId,
      applicationName: application.name,
      tenantId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    logger.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
    });
  }
};

/**
 * Get application statistics
 */
export const getApplicationStats = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { tenantId } = req.user;
    const { period = '30d' } = req.query;

    // Verify application belongs to tenant
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalEmails,
      deliveredEmails,
      bouncedEmails,
      complainedEmails,
      identityCount,
      templateCount,
    ] = await Promise.all([
      prisma.emailLog.count({
        where: {
          applicationId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.emailLog.count({
        where: {
          applicationId,
          status: 'DELIVERED',
          createdAt: { gte: startDate },
        },
      }),
      prisma.emailLog.count({
        where: {
          applicationId,
          status: 'BOUNCED',
          createdAt: { gte: startDate },
        },
      }),
      prisma.emailLog.count({
        where: {
          applicationId,
          status: 'COMPLAINED',
          createdAt: { gte: startDate },
        },
      }),
      prisma.identity.count({
        where: {
          applicationId,
          status: 'VERIFIED',
        },
      }),
      prisma.template.count({
        where: {
          applicationId,
          isActive: true,
        },
      }),
    ]);

    const deliveryRate = totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0;
    const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;
    const complaintRate = totalEmails > 0 ? (complainedEmails / totalEmails) * 100 : 0;

    res.json({
      success: true,
      data: {
        stats: {
          period,
          emails: {
            total: totalEmails,
            delivered: deliveredEmails,
            bounced: bouncedEmails,
            complained: complainedEmails,
          },
          rates: {
            delivery: parseFloat(deliveryRate.toFixed(2)),
            bounce: parseFloat(bounceRate.toFixed(2)),
            complaint: parseFloat(complaintRate.toFixed(2)),
          },
          resources: {
            identities: identityCount,
            templates: templateCount,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Get application stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application statistics',
    });
  }
};

// Export all functions as an object for consistent import pattern
export const applicationController = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getApplicationStats
};
