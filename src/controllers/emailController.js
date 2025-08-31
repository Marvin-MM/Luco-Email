import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sesService } from '../services/sesService.js';
import { templateService } from '../services/templateService.js';
import { emailQueueService } from '../services/emailQueueService.js';
import { billingService } from '../services/billingService.js';
import { tenantService } from '../services/tenantService.js';
import { VALIDATION_RULES } from '../utils/constants.js';

/**
 * Send a single email via API (for SDK usage)
 */
export const sendEmail = async (req, res) => {
  try {
    const {
      to,
      from,
      subject,
      html,
      text,
      templateId,
      variables = {},
      scheduledAt,
      tags = {},
    } = req.body;
    const { tenantId } = req.user;

    // Validate required fields
    if (!to || !subject || (!html && !text && !templateId)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and content (html/text/templateId)',
      });
    }

    // Validate email addresses
    const recipients = Array.isArray(to) ? to : [to];
    const emailRegex = VALIDATION_RULES.EMAIL;

    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: `Invalid email address: ${email}`,
        });
      }
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

    // Get sender identity
    let senderIdentity;
    if (from) {
      senderIdentity = await prisma.identity.findFirst({
        where: {
          value: from.toLowerCase(),
          tenantId,
          status: 'VERIFIED',
        },
      });

      if (!senderIdentity) {
        return res.status(400).json({
          success: false,
          message: 'Sender identity not found or not verified',
        });
      }
    } else {
      // Use default identity from any application
      senderIdentity = await prisma.identity.findFirst({
        where: {
          tenantId,
          status: 'VERIFIED',
        },
        include: {
          application: true,
        },
      });

      if (!senderIdentity) {
        return res.status(400).json({
          success: false,
          message: 'No verified sender identity found',
        });
      }
    }

    // Process template if provided
    let finalHtml = html;
    let finalText = text;
    let finalSubject = subject;

    if (templateId) {
      try {
        const template = await prisma.template.findFirst({
          where: {
            id: templateId,
            tenantId,
            isActive: true,
          },
        });

        if (!template) {
          return res.status(404).json({
            success: false,
            message: 'Template not found or inactive',
          });
        }

        const renderedContent = await templateService.renderTemplate(
          templateId,
          variables,
          tenantId
        );

        finalHtml = renderedContent.htmlContent;
        finalText = renderedContent.textContent;
        finalSubject = renderedContent.subject || subject;
      } catch (templateError) {
        logger.error('Template processing error:', templateError);
        return res.status(400).json({
          success: false,
          message: 'Failed to process template',
          error: templateError.message,
        });
      }
    }

    // If scheduled, create campaign for future sending
    if (scheduledAt) {
      const campaign = await prisma.campaign.create({
        data: {
          name: `API Email - ${new Date().toISOString()}`,
          subject: finalSubject,
          status: 'SCHEDULED',
          scheduledAt: new Date(scheduledAt),
          totalRecipients: recipients.length,
          variables,
          templateId,
          identityId: senderIdentity.id,
          tenantId,
          applicationId: senderIdentity.applicationId,
          userId: req.user.id,
        },
      });

      // Create campaign recipients
      const recipientData = recipients.map(email => ({
        campaignId: campaign.id,
        email: email.toLowerCase(),
        variables: {},
        status: 'PENDING',
      }));

      await prisma.campaignRecipient.createMany({
        data: recipientData,
      });

      return res.status(201).json({
        success: true,
        message: 'Email scheduled successfully',
        data: {
          campaignId: campaign.id,
          scheduledAt: campaign.scheduledAt,
          recipientCount: recipients.length,
        },
      });
    }

    // Send immediately
    const emailResults = [];
    const tenant = await tenantService.getTenantById(tenantId);
    let emailLog;

    for (const recipientEmail of recipients) {
      try {
        // Create email log entry
        emailLog = await prisma.emailLog.create({
          data: {
            recipientEmail: recipientEmail.toLowerCase(),
            subject: finalSubject,
            htmlContent: finalHtml || '',
            textContent: finalText || '',
            status: 'SENDING',
            templateId,
            identityId: senderIdentity.id,
            tenantId,
            applicationId: senderIdentity.applicationId,
            tags,
          },
        });

        // Send via SES
        const sesResult = await sesService.sendEmail({
          fromEmail: senderIdentity.value,
          toEmails: [recipientEmail],
          subject: finalSubject,
          htmlContent: finalHtml,
          textContent: finalText,
          configurationSetName: tenant.sesConfigurationSet,
          messageId: emailLog.id,
        });

        // Update email log with success
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'SENT',
            sesMessageId: sesResult.MessageId,
            sentAt: new Date(),
          },
        });

        // Update tenant email usage
        await tenantService.updateEmailUsage(tenantId, 1);

        emailResults.push({
          email: recipientEmail,
          success: true,
          messageId: sesResult.MessageId,
          emailLogId: emailLog.id,
        });

        // Track usage for billing
        await emailQueueService.queueBillingUsage(tenantId, {
          eventType: 'EMAIL_SENT',
          count: 1,
          metadata: {
            emailLogId: emailLog.id,
            identityId: senderIdentity.id,
          },
        });

      } catch (emailError) {
        logger.error('Failed to send email:', emailError);

        // Update email log with failure
        if (emailLog?.id) { // <-- Now this check will work correctly
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: 'FAILED',
              errorMessage: emailError.message,
            },
          });
        }

        emailResults.push({
          email: recipientEmail,
          success: false,
          error: emailError.message,
        });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.length - successCount;

    res.status(successCount > 0 ? 200 : 500).json({
      success: successCount > 0,
      message: `${successCount} emails sent successfully, ${failureCount} failed`,
      data: {
        results: emailResults,
        summary: {
          total: emailResults.length,
          successful: successCount,
          failed: failureCount,
        },
      },
    });

  } catch (error) {
    logger.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message,
    });
  }
};

/**
 * Send bulk emails via API
 */
// export const sendBulkEmail = async (req, res) => {
//   try {
//     const {
//       emails,
//       templateId,
//       variables = {},
//       batchSize = 100,
//       delayBetweenBatches = 5000,
//     } = req.body;
//     const { tenantId } = req.user;

//     if (!emails || !Array.isArray(emails) || emails.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'emails array is required and must not be empty',
//       });
//     }

//     // Validate email format
//     const emailRegex = VALIDATION_RULES.EMAIL;
//     const invalidEmails = emails.filter(emailData => {
//       const email = typeof emailData === 'string' ? emailData : emailData.to;
//       return !emailRegex.test(email);
//     });

//     if (invalidEmails.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid email addresses found',
//         data: { invalidEmails: invalidEmails.slice(0, 10) },
//       });
//     }

//     // Check email sending limits
//     const emailLimit = await billingService.checkEmailLimit(tenantId, emails.length);
//     if (!emailLimit.allowed) {
//       return res.status(429).json({
//         success: false,
//         message: emailLimit.reason,
//         data: {
//           remaining: emailLimit.remaining,
//           limit: emailLimit.limit,
//           used: emailLimit.used,
//         },
//       });
//     }

//     // Queue bulk email job
//     const job = await emailQueueService.queueBulkEmails(
//       emails.map(emailData => ({
//         ...emailData,
//         templateId,
//         variables: { ...variables, ...(emailData.variables || {}) },
//         tenantId,
//       })),
//       { batchSize, delayBetweenBatches }
//     );

//     // Update tenant email usage
//     await tenantService.updateEmailUsage(tenantId, emails.length);

//     // Log successful email addition to queue
//     logger.info(`Email queued successfully for ${emails.length} recipients`, {
//       jobId: job.id,
//       tenantId,
//       applicationId: req.user.applicationId,
//     });

//     res.status(202).json({
//       success: true,
//       message: 'Bulk emails queued for processing',
//       data: {
//         jobId: job.id,
//         emailCount: emails.length,
//         estimatedProcessingTime: `${Math.ceil(emails.length / batchSize) * (delayBetweenBatches / 1000)} seconds`,
//       },
//     });

//   } catch (error) {
//     logger.error('Send bulk email error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to queue bulk emails',
//       error: error.message,
//     });
//   }
// };


/**
 * Send bulk emails by creating and queuing an on-the-fly campaign.
 */
export const sendBulkEmail = async (req, res) => {
  try {
    const {
      recipients, // Renamed from 'emails' for clarity
      subject,
      templateId,
      applicationId,
      identityId,
      variables = {}
    } = req.body;
    const { tenantId, id: userId } = req.user;

    // 1. Validate required fields for creating a campaign
    if (!recipients?.length || !subject || !templateId || !applicationId || !identityId) {
      return res.status(400).json({
        success: false,
        message: 'recipients, subject, templateId, applicationId, and identityId are required.',
      });
    }

    // 2. Check tenant's email sending limits
    const emailLimit = await billingService.checkEmailLimit(tenantId, recipients.length);
    if (!emailLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: emailLimit.reason,
        data: { remaining: emailLimit.remaining, limit: emailLimit.limit },
      });
    }

    // 3. Verify that the application, template, and identity belong to the tenant
    const [application, template, identity] = await Promise.all([
      prisma.application.findFirst({ where: { id: applicationId, tenantId } }),
      prisma.template.findFirst({ where: { id: templateId, tenantId, isActive: true } }),
      prisma.identity.findFirst({ where: { id: identityId, tenantId, status: 'VERIFIED' } }),
    ]);

    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found or is inactive.' });
    if (!identity) return res.status(404).json({ success: false, message: 'Sender identity not found or is not verified.' });

    // 4. Create the Campaign record in the database
    const campaign = await prisma.campaign.create({
      data: {
        name: `API Bulk Send - ${new Date().toISOString()}`,
        subject: subject || template.subject,
        status: 'SENDING', // Set to SENDING to be picked up by the queue immediately
        sentAt: new Date(),
        totalRecipients: recipients.length,
        variables,
        applicationId,
        templateId,
        identityId,
        tenantId,
        userId,
      },
      include: { // Include relations needed by the queue service
        template: true,
        identity: true,
        tenant: true,
      }
    });

    // 5. Create all CampaignRecipient records
    const recipientData = recipients.map(recipient => ({
      campaignId: campaign.id,
      email: (typeof recipient === 'string' ? recipient : recipient.email).toLowerCase(),
      variables: recipient.variables || {},
      status: 'PENDING',
    }));

    await prisma.campaignRecipient.createMany({
      data: recipientData,
    });

    // 6. Queue the entire campaign for processing
    await emailQueueService.queueCampaign(campaign);

    logger.info(`Bulk email send queued as campaign`, {
      campaignId: campaign.id,
      tenantId,
      recipientCount: recipients.length,
    });

    res.status(202).json({
      success: true,
      message: 'Bulk email job accepted and queued for processing.',
      data: {
        campaignId: campaign.id,
        emailCount: recipients.length,
      },
    });
  } catch (error) {
    logger.error('Send bulk email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue bulk emails',
      error: error.message,
    });
  }
};

/**
 * Get email logs for the tenant
 */
export const getEmailLogs = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      page = 1,
      limit = 50,
      status,
      search,
      dateFrom,
      dateTo,
      templateId,
      campaignId,
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      ...(status && { status }),
      ...(templateId && { templateId }),
      ...(campaignId && { campaignId }),
      ...(search && {
        OR: [
          { recipientEmail: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      },
    };

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          template: {
            select: { id: true, name: true },
          },
          identity: {
            select: { id: true, value: true, type: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('Get email logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email logs',
    });
  }
};

/**
 * Get email log by ID
 */
export const getEmailLogById = async (req, res) => {
  try {
    const { emailLogId } = req.params;
    const { tenantId } = req.user;

    const emailLog = await prisma.emailLog.findFirst({
      where: {
        id: emailLogId,
        tenantId,
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
        identity: {
          select: { id: true, value: true, type: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
    });

    if (!emailLog) {
      return res.status(404).json({
        success: false,
        message: 'Email log not found',
      });
    }

    res.json({
      success: true,
      data: { emailLog },
    });

  } catch (error) {
    logger.error('Get email log by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email log',
    });
  }
};

// Export all functions as an object for consistent import pattern
export const emailController = {
  sendEmail,
  sendBulkEmail,
  getEmailLogs,
  getEmailLogById
};