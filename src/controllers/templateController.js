import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { templateService } from '../services/templateService.js';
import { billingService } from '../services/billingService.js';
import { tenantService } from '../services/tenantService.js'; // Import tenantService

/**
 * Create a new email template
 */
export const createTemplate = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { applicationId, name, subject, htmlContent, textContent, variables, description, isActive = true } = req.body;

    // Validate input
    if (!applicationId || !name || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Application ID, name, subject, and HTML content are required',
      });
    }

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

    // Check template creation limits for custom templates
    // This check is now performed at the beginning of the function
    const templateLimit = await billingService.checkTemplateLimit(tenantId);
    if (!templateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: templateLimit.reason,
        data: {
          remaining: templateLimit.remaining,
          limit: templateLimit.limit,
          used: templateLimit.used,
        },
      });
    }


    // Check if template name already exists for this application
    const existingTemplate = await prisma.template.findFirst({
      where: {
        name,
        applicationId,
        tenantId,
      },
    });

    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        message: 'Template with this name already exists for this application',
      });
    }

    // Validate template variables format
    let parsedVariables = [];
    if (variables) {
      try {
        parsedVariables = Array.isArray(variables) ? variables : JSON.parse(variables);

        // Validate variable structure
        for (const variable of parsedVariables) {
          if (!variable.name || !variable.type) {
            throw new Error('Each variable must have name and type');
          }
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid variables format. Each variable must have name and type.',
        });
      }
    }

    // Create template
    const template = await prisma.template.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent: textContent || null,
        type: 'CUSTOM',
        variables: parsedVariables,
        description: description || null,
        isActive,
        applicationId,
        tenantId,
        userId: req.user.id,
      },
      include: {
        application: {
          select: {
            id: true,
            name: true,
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
            emailLogs: true,
          },
        },
      },
    });

    logger.info('Template created successfully', {
      templateId: template.id,
      name: template.name,
      applicationId,
      tenantId,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: {
        template,
      },
    });
  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
    });
  }
};

/**
 * Get templates for an application
 */
export const getTemplates = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { tenantId } = req.user;
    const { page = 1, limit = 10, search, isActive } = req.query;

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

    const skip = (page - 1) * limit;
    const where = {
      applicationId,
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
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
          _count: {
            select: {
              emailLogs: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.template.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        templates,
        application: {
          id: application.id,
          name: application.name,
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
    });
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { tenantId } = req.user;

    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        tenantId,
      },
      include: {
        application: {
          select: {
            id: true,
            name: true,
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
            emailLogs: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: {
        template,
      },
    });
  } catch (error) {
    logger.error('Get template by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
    });
  }
};

/**
 * Update template
 */
export const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { tenantId } = req.user;
    const { name, subject, htmlContent, textContent, variables, description, isActive } = req.body;

    // Check if template exists and belongs to tenant
    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        tenantId,
      },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // If updating name, check for duplicates
    if (name && name !== existingTemplate.name) {
      const duplicateTemplate = await prisma.template.findFirst({
        where: {
          name,
          applicationId: existingTemplate.applicationId,
          tenantId,
          id: { not: templateId },
        },
      });

      if (duplicateTemplate) {
        return res.status(409).json({
          success: false,
          message: 'Template with this name already exists for this application',
        });
      }
    }

    // Check template creation limits if isActive is changed to true
    if (isActive !== undefined && isActive && !existingTemplate.isActive) {
      const templateLimit = await billingService.checkTemplateLimit(tenantId);
      if (!templateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: templateLimit.reason,
          data: {
            remaining: templateLimit.remaining,
            limit: templateLimit.limit,
            used: templateLimit.used,
          },
        });
      }
    }

    // Validate template variables format if provided
    let parsedVariables;
    if (variables !== undefined) {
      try {
        parsedVariables = Array.isArray(variables) ? variables : JSON.parse(variables);

        // Validate variable structure
        for (const variable of parsedVariables) {
          if (!variable.name || !variable.type) {
            throw new Error('Each variable must have name and type');
          }
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid variables format. Each variable must have name and type.',
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (htmlContent !== undefined) updateData.htmlContent = htmlContent;
    if (textContent !== undefined) updateData.textContent = textContent;
    if (variables !== undefined) updateData.variables = parsedVariables;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await prisma.template.update({
      where: { id: templateId },
      data: updateData,
      include: {
        application: {
          select: {
            id: true,
            name: true,
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
            emailLogs: true,
          },
        },
      },
    });

    logger.info('Template updated successfully', {
      templateId,
      tenantId,
      userId: req.user.id,
      changes: updateData,
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        template,
      },
    });
  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
    });
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { tenantId } = req.user;

    // Check if template exists and belongs to tenant
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
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

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Check if template has been used (prevent accidental deletion)
    if (template._count.emailLogs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete template with email history. Deactivate instead.',
        data: {
          emailCount: template._count.emailLogs,
          suggestion: 'Set isActive to false to deactivate the template',
        },
      });
    }

    // Delete template
    await prisma.template.delete({
      where: { id: templateId },
    });

    logger.info('Template deleted successfully', {
      templateId,
      templateName: template.name,
      tenantId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
    });
  }
};

/**
 * Preview template with variables
 */
export const previewTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { tenantId } = req.user;
    const { variables: previewVariables = {} } = req.body;

    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        tenantId,
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Process template with variables
    const processedTemplate = await templateService.renderTemplate(
      template.id,
      previewVariables,
      tenantId
    );

    // Get template statistics
    const templateStats = await templateService.getTemplateStats(template.id, tenantId);

    processedTemplate.stats = templateStats;


    res.json({
      success: true,
      data: {
        preview: processedTemplate,
        template: {
          id: template.id,
          name: template.name,
          variables: template.variables,
        },
        providedVariables: previewVariables,
      },
    });
  } catch (error) {
    logger.error('Preview template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview template',
    });
  }
};

/**
 * Clone template
 */
export const cloneTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { tenantId } = req.user;
    const { name, applicationId } = req.body;

    const originalTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        tenantId,
      },
    });

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    const targetApplicationId = applicationId || originalTemplate.applicationId;

    // Verify target application belongs to tenant
    const application = await prisma.application.findFirst({
      where: {
        id: targetApplicationId,
        tenantId,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Target application not found',
      });
    }

    // Check if template name already exists in target application
    const existingTemplate = await prisma.template.findFirst({
      where: {
        name,
        applicationId: targetApplicationId,
        tenantId,
      },
    });

    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        message: 'Template with this name already exists in the target application',
      });
    }

    // Check template creation limits if the cloned template will be active
    if (originalTemplate.isActive) {
      const templateLimit = await billingService.checkTemplateLimit(tenantId);
      if (!templateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: templateLimit.reason,
          data: {
            remaining: templateLimit.remaining,
            limit: templateLimit.limit,
            used: templateLimit.used,
          },
        });
      }
    }

    // Create cloned template
    const clonedTemplate = await prisma.template.create({
      data: {
        name,
        subject: originalTemplate.subject,
        htmlContent: originalTemplate.htmlContent,
        textContent: originalTemplate.textContent,
        variables: originalTemplate.variables,
        description: `Cloned from: ${originalTemplate.name}`,
        isActive: originalTemplate.isActive,
        applicationId: targetApplicationId,
        tenantId,
        userId: req.user.id,
      },
      include: {
        application: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Template cloned successfully', {
      originalTemplateId: templateId,
      clonedTemplateId: clonedTemplate.id,
      tenantId,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: {
        template: clonedTemplate,
      },
    });
  } catch (error) {
    logger.error('Clone template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clone template',
    });
  }
};

// --- Tenant Service Integrations ---

/**
 * Get all tenants (for admin/super admin)
 */
export const getAllTenants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { id: { contains: search, mode: 'insensitive' } }, // Assuming ID can also be searched
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get all tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all tenants',
    });
  }
};

/**
 * Get tenant by ID
 */
export const getTenantById = async (req, res) => {
  try {
    const { tenantId } = req.params;
    // Fetch tenant details including subscription and limits
    const tenant = await tenantService.getTenantById(tenantId); // Use tenantService

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      data: {
        tenant,
      },
    });
  } catch (error) {
    logger.error('Get tenant by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant details',
    });
  }
};

/**
 * Create a new tenant
 */
export const createTenant = async (req, res) => {
  try {
    const { name, email, planId, isActive = true } = req.body;

    // Basic validation
    if (!name || !email || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant name, email, and plan ID are required',
      });
    }

    // Use tenantService to create tenant and set initial subscription
    const newTenant = await tenantService.createTenant(name, email, planId, isActive); // Use tenantService

    logger.info('Tenant created successfully', { tenantId: newTenant.id, name, email });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenant: newTenant,
      },
    });
  } catch (error) {
    logger.error('Create tenant error:', error);
    // Specific error handling for duplicate email or other known issues
    if (error.message.includes('Unique constraint failed on the fields: (`email`)')) {
      return res.status(409).json({
        success: false,
        message: 'Tenant with this email already exists.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
    });
  }
};

/**
 * Update tenant details
 */
export const updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, email, planId, isActive } = req.body;

    // Use tenantService to update tenant
    const updatedTenant = await tenantService.updateTenant(tenantId, { name, email, planId, isActive }); // Use tenantService

    if (!updatedTenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    logger.info('Tenant updated successfully', { tenantId, name, email, isActive });

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        tenant: updatedTenant,
      },
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
 * Delete a tenant
 */
export const deleteTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Use tenantService to delete tenant
    const deletedTenant = await tenantService.deleteTenant(tenantId); // Use tenantService

    if (!deletedTenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    logger.info('Tenant deleted successfully', { tenantId });

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    logger.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tenant',
    });
  }
};

/**
 * Get subscription limits for a tenant
 */
export const getSubscriptionLimits = async (req, res) => {
  try {
    const { tenantId } = req.user; // Assuming tenantId is available in req.user

    // Use tenantService to get subscription limits
    const limits = await tenantService.getSubscriptionLimits(tenantId); // Use tenantService

    res.json({
      success: true,
      data: {
        limits,
      },
    });
  } catch (error) {
    logger.error('Get subscription limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription limits',
    });
  }
};

/**
 * Update subscription limits for a tenant
 */
export const updateSubscriptionLimits = async (req, res) => {
  try {
    const { tenantId } = req.params; // Or potentially from req.user if updating self
    const { limits } = req.body;

    // Basic validation
    if (!limits || typeof limits !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Limits object is required',
      });
    }

    // Use tenantService to update subscription limits
    const updatedLimits = await tenantService.updateSubscriptionLimits(tenantId, limits); // Use tenantService

    logger.info('Subscription limits updated successfully', { tenantId, updatedLimits });

    res.json({
      success: true,
      message: 'Subscription limits updated successfully',
      data: {
        limits: updatedLimits,
      },
    });
  } catch (error) {
    logger.error('Update subscription limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription limits',
    });
  }
};

/**
 * Get tenant applications
 */
export const getTenantApplications = async (req, res) => {
  try {
    const { tenantId } = req.user; // Assuming tenantId is available in req.user

    // Use tenantService to get applications for the tenant
    const applications = await tenantService.getTenantApplications(tenantId); // Use tenantService

    res.json({
      success: true,
      data: {
        applications,
      },
    });
  } catch (error) {
    logger.error('Get tenant applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant applications',
    });
  }
};

/**
 * Get tenant users
 */
export const getTenantUsers = async (req, res) => {
  try {
    const { tenantId } = req.user; // Assuming tenantId is available in req.user

    // Use tenantService to get users for the tenant
    const users = await tenantService.getTenantUsers(tenantId); // Use tenantService

    res.json({
      success: true,
      data: {
        users,
      },
    });
  } catch (error) {
    logger.error('Get tenant users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant users',
    });
  }
};

/**
 * Get tenant settings
 */
export const getTenantSettings = async (req, res) => {
  try {
    const { tenantId } = req.user; // Assuming tenantId is available in req.user

    // Use tenantService to get settings for the tenant
    const settings = await tenantService.getTenantSettings(tenantId); // Use tenantService

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    logger.error('Get tenant settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant settings',
    });
  }
};

/**
 * Update tenant settings
 */
export const updateTenantSettings = async (req, res) => {
  try {
    const { tenantId } = req.params; // Or potentially from req.user if updating self
    const { settings } = req.body;

    // Basic validation
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required',
      });
    }

    // Use tenantService to update tenant settings
    const updatedSettings = await tenantService.updateTenantSettings(tenantId, settings); // Use tenantService

    logger.info('Tenant settings updated successfully', { tenantId, updatedSettings });

    res.json({
      success: true,
      message: 'Tenant settings updated successfully',
      data: {
        settings: updatedSettings,
      },
    });
  } catch (error) {
    logger.error('Update tenant settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant settings',
    });
  }
};

/**
 * Validate template syntax and variables
 */
export const validateTemplateSyntax = async (req, res) => {
  try {
    const { subject, htmlContent, textContent, variables = {} } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Subject and HTML content are required',
      });
    }

    // Validate template syntax
    const syntaxValidation = templateService.validateTemplateSyntax(subject, htmlContent, textContent);

    // Validate with provided variables
    const variableValidation = await templateService.validateTemplate(
      `${subject} ${htmlContent} ${textContent || ''}`,
      variables
    );

    res.json({
      success: true,
      data: {
        syntax: syntaxValidation,
        variables: variableValidation,
      },
    });
  } catch (error) {
    logger.error('Validate template syntax error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate template',
    });
  }
};

/**
 * Get template statistics
 */
export const getTemplateStatistics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { templateId } = req.params;
    const { period = '30d' } = req.query;

    const stats = await templateService.getTemplateStats(templateId, tenantId, period);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get template statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template statistics',
    });
  }
};

export default {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  cloneTemplate,
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getSubscriptionLimits,
  updateSubscriptionLimits,
  getTenantApplications,
  getTenantUsers,
  getTenantSettings,
  updateTenantSettings,
  validateTemplateSyntax,
  getTemplateStatistics,
};