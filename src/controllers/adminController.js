import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { tenantService } from '../services/tenantService.js';
import { analyticsService } from '../services/analyticsService.js';

/**
 * Get admin dashboard overview
 */
export const getAdminDashboard = async (req, res) => {
  try {
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

    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      totalEmailsSent,
      totalRevenue,
      systemHealth,
      tenantGrowth,
      revenueGrowth,
      topTenantsByUsage,
    ] = await Promise.all([
      // Total tenants
      prisma.tenant.count(),

      // Active tenants (sent emails in last 30 days)
      prisma.tenant.count({
        where: {
          emailLogs: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),

      // Total users
      prisma.user.count(),

      // Active users (logged in last 30 days)
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total emails sent in period
      prisma.emailLog.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Total revenue (mock calculation)
      prisma.subscription.aggregate({
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // System health metrics
      this.getSystemHealth(),

      // Tenant growth over time
      this.getTenantGrowth(startDate, endDate),

      // Revenue growth over time
      this.getRevenueGrowth(startDate, endDate),

      // Top tenants by email usage
      prisma.tenant.findMany({
        select: {
          id: true,
          organizationName: true,
          subscriptionPlan: true,
          _count: {
            select: {
              emailLogs: {
                where: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          emailLogs: {
            _count: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalTenants,
          activeTenants,
          totalUsers,
          activeUsers,
          totalEmailsSent,
          totalRevenue: totalRevenue._sum.amount || 0,
          tenantActivityRate: totalTenants > 0 ? (activeTenants / totalTenants) * 100 : 0,
          userActivityRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        },
        systemHealth,
        growth: {
          tenants: tenantGrowth,
          revenue: revenueGrowth,
        },
        topTenants: topTenantsByUsage.map(tenant => ({
          id: tenant.id,
          organizationName: tenant.organizationName,
          subscriptionPlan: tenant.subscriptionPlan,
          emailsSent: tenant._count.emailLogs,
        })),
        period,
      },
    });
  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard',
    });
  }
};

/**
 * Get all tenants with pagination and filtering
 */
export const getAllTenants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      plan,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { organizationName: { contains: search, mode: 'insensitive' } },
          { users: { some: { email: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
      ...(status && { status }),
      ...(plan && { subscriptionPlan: plan }),
    };

    const [tenants, totalCount] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              applications: true,
              templates: true,
              emailLogs: true,
              identities: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          page: parseInt(page),
          limit: take,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          search,
          status,
          plan,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    logger.error('Get all tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenants',
    });
  }
};

/**
 * Get tenant details by ID
 */
export const getTenantDetails = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const [tenant, usageSummary] = await Promise.all([
      tenantService.getTenantById(tenantId, true),
      tenantService.getTenantUsageSummary(tenantId)
    ]);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: { 
        tenant: {
          ...tenant,
          usageSummary
        }
      }
    });

  } catch (error) {
    logger.error('Get tenant details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant details'
    });
  }
};

/**
 * Update tenant status or limits
 */
export const updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      status,
      subscriptionPlan,
      monthlyEmailLimit,
      customTemplateLimit,
      attachmentSizeLimit,
      notes,
    } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    const updateData = {};

    if (status) updateData.status = status;
    if (subscriptionPlan) {
      const limits = tenantService.getSubscriptionLimits(subscriptionPlan);
      updateData.subscriptionPlan = subscriptionPlan;
      updateData.monthlyEmailLimit = limits.monthlyEmailLimit;
      updateData.customTemplateLimit = limits.customTemplateLimit;
      updateData.attachmentSizeLimit = limits.attachmentSizeLimit;
    }
    if (monthlyEmailLimit !== undefined) updateData.monthlyEmailLimit = monthlyEmailLimit;
    if (customTemplateLimit !== undefined) updateData.customTemplateLimit = customTemplateLimit;
    if (attachmentSizeLimit !== undefined) updateData.attachmentSizeLimit = attachmentSizeLimit;
    if (notes !== undefined) updateData.adminNotes = notes;

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    logger.info('Tenant updated by admin', {
      adminId: req.admin.id,
      tenantId,
      changes: updateData,
    });

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: { tenant: updatedTenant },
    });
  } catch (error) {
    logger.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant',
    });
  }
};

/**
 * Deactivate a tenant (admin only)
 */
export const deactivateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    const tenant = await tenantService.deactivateTenant(tenantId, reason || 'Deactivated by admin');

    logger.info('Tenant deactivated by admin', {
      tenantId,
      adminId: req.user.id,
      reason
    });

    res.json({
      success: true,
      message: 'Tenant deactivated successfully',
      data: { tenant }
    });

  } catch (error) {
    logger.error('Deactivate tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate tenant'
    });
  }
};

/**
 * Get all users with filtering and pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      tenantId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
      ...(status !== undefined && { isActive: status === 'active' }),
      ...(tenantId && { tenantId }),
    };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          tenant: {
            select: {
              id: true,
              organizationName: true,
              subscriptionPlan: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: take,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          search,
          role,
          status,
          tenantId,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

/**
 * Get system health metrics
 */
export const getSystemHealth = async () => {
  try {
    const [
      dbHealth,
      queueHealth,
      emailHealth,
      identityHealth,
    ] = await Promise.all([
      // Database health
      prisma.$queryRaw`SELECT 1 as healthy`.then(() => ({ status: 'healthy' })).catch(() => ({ status: 'unhealthy' })),

      // Queue health (if available)
      this.getQueueHealth(),

      // Email system health
      prisma.emailLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          status: 'FAILED',
        },
      }).then(failedCount => ({
        status: failedCount < 100 ? 'healthy' : 'degraded',
        failedEmailsLast24h: failedCount,
      })),

      // Identity verification health
      prisma.identity.count({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }).then(pendingCount => ({
        status: pendingCount < 50 ? 'healthy' : 'needs_attention',
        longPendingIdentities: pendingCount,
      })),
    ]);

    return {
      database: dbHealth,
      queues: queueHealth,
      email: emailHealth,
      identities: identityHealth,
      overall: this.calculateOverallHealth([dbHealth, queueHealth, emailHealth, identityHealth]),
    };
  } catch (error) {
    logger.error('Get system health error:', error);
    return {
      database: { status: 'unhealthy' },
      queues: { status: 'unknown' },
      email: { status: 'unknown' },
      identities: { status: 'unknown' },
      overall: { status: 'unhealthy' },
    };
  }
};

/**
 * Get queue health metrics
 */
export const getQueueHealth = async () => {
  try {
    const { emailQueueService } = await import('../services/emailQueueService.js');
    const stats = await emailQueueService.getQueueStats();

    const totalWaiting = Object.values(stats).reduce((sum, queue) => sum + queue.waiting, 0);
    const totalActive = Object.values(stats).reduce((sum, queue) => sum + queue.active, 0);
    const totalFailed = Object.values(stats).reduce((sum, queue) => sum + queue.failed, 0);

    return {
      status: totalFailed > 100 || totalWaiting > 1000 ? 'degraded' : 'healthy',
      totalWaiting,
      totalActive,
      totalFailed,
      queues: stats,
    };
  } catch (error) {
    return { status: 'unknown', error: error.message };
  }
};

/**
 * Calculate overall system health
 */
export const calculateOverallHealth = (components) => {
  const healthyCount = components.filter(c => c.status === 'healthy').length;
  const degradedCount = components.filter(c => c.status === 'degraded' || c.status === 'needs_attention').length;
  const unhealthyCount = components.filter(c => c.status === 'unhealthy' || c.status === 'unknown').length;

  if (unhealthyCount > 0) {
    return { status: 'unhealthy' };
  } else if (degradedCount > 0) {
    return { status: 'degraded' };
  } else {
    return { status: 'healthy' };
  }
};

/**
 * Get tenant growth data
 */
export const getTenantGrowth = async (startDate, endDate) => {
  try {
    const growth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as count
      FROM "Tenant"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    return growth.map(item => ({
      date: item.date,
      count: parseInt(item.count),
    }));
  } catch (error) {
    logger.error('Get tenant growth error:', error);
    return [];
  }
};

/**
 * Get revenue growth data
 */
export const getRevenueGrowth = async (startDate, endDate) => {
  try {
    const growth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        SUM("amount") as revenue
      FROM "Subscription"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      AND "status" = 'ACTIVE'
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    return growth.map(item => ({
      date: item.date,
      revenue: parseFloat(item.revenue || 0),
    }));
  } catch (error) {
    logger.error('Get revenue growth error:', error);
    return [];
  }
};