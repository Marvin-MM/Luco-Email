import Queue from 'bull';
import Redis from 'redis';
import { prisma } from '../config/database.js';
import { sesService } from './sesService.js';
import { templateService } from './templateService.js';
import { queueService } from './queueService.js';
import { tenantService } from './tenantService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

class EmailQueueService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      await queueService.initialize();
      this.isInitialized = true;
      logger.info('Email queue service initialized');
    }
  }

  /**
   * Queue a campaign for processing
   */
  async queueCampaign(campaign, options = {}) {
    const { batchSize = 100, delayBetweenBatches = 5000 } = options;

    try {
      await this.initialize();

      logger.info('Queueing campaign for processing', {
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalRecipients: campaign.totalRecipients,
      });

      const job = await queueService.addJob(
        'campaign',
        'process-campaign',
        {
          campaignId: campaign.id,
          batchSize,
          delayBetweenBatches,
        },
        {
          attempts: 3,
          backoff: 'exponential',
          removeOnComplete: 10,
          removeOnFail: 10,
        }
      );

      logger.info('Campaign queued successfully', {
        campaignId: campaign.id,
        jobId: job.id,
      });
    } catch (error) {
      logger.error('Failed to queue campaign:', error);
      throw error;
    }
  }

  /**
   * Process campaign job
   */
  async processCampaignJob(job) {
    const { campaignId, batchSize, delayBetweenBatches } = job.data;

    try {
      logger.info('Processing campaign', { campaignId });

      // Get campaign with related data
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          template: true,
          identity: true,
          tenant: true,
          application: true,
        },
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (campaign.status === 'CANCELLED') {
        logger.info('Campaign was cancelled, skipping', { campaignId });
        return { status: 'cancelled' };
      }

      // Get pending recipients in batches
      let skip = 0;
      let batch = 0;
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      while (true) {
        const recipients = await prisma.campaignRecipient.findMany({
          where: {
            campaignId,
            status: 'PENDING',
          },
          take: batchSize,
          skip,
          orderBy: { createdAt: 'asc' },
        });

        if (recipients.length === 0) {
          break;
        }

        logger.info(`Processing batch ${batch + 1} for campaign ${campaignId}`, {
          recipientCount: recipients.length,
        });

        // Process batch
        const batchResults = await Promise.allSettled(
          recipients.map(recipient => this.queueSingleEmail(campaign, recipient))
        );

        // Update recipient statuses
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          const result = batchResults[i];

          if (result.status === 'fulfilled') {
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: { status: 'QUEUED', queuedAt: new Date() },
            });
            totalSuccessful++;
          } else {
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'FAILED',
                failureReason: result.reason?.message || 'Unknown error',
                failedAt: new Date(),
              },
            });
            totalFailed++;
          }
        }

        totalProcessed += recipients.length;
        skip += batchSize;
        batch++;

        // Update campaign progress
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            processed: totalProcessed,
            successful: totalSuccessful,
            failed: totalFailed,
          },
        });

        // Check if campaign was cancelled
        const updatedCampaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });

        if (updatedCampaign?.status === 'CANCELLED') {
          logger.info('Campaign cancelled during processing', { campaignId });
          break;
        }

        // Delay between batches to respect rate limits
        if (recipients.length === batchSize && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      // Update final campaign status
      const finalStatus = totalFailed > 0 && totalSuccessful === 0 ? 'FAILED' : 'SENT';
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });

      logger.info('Campaign processing completed', {
        campaignId,
        totalProcessed,
        totalSuccessful,
        totalFailed,
        finalStatus,
      });

      return {
        status: 'completed',
        totalProcessed,
        totalSuccessful,
        totalFailed,
      };
    } catch (error) {
      logger.error('Campaign processing failed:', error);

      // Update campaign status to failed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'FAILED',
          failureReason: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Queue a single email
   */
  async queueSingleEmail(campaign, recipient) {
    try {
      const emailData = {
        campaignId: campaign.id,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        templateId: campaign.templateId,
        identityId: campaign.identityId,
        variables: {
          ...campaign.variables,
          ...recipient.variables,
        },
        tenantId: campaign.tenantId,
      };

      const job = await queueService.addJob(
        'email',
        'send-email',
        emailData,
        {
          attempts: 3,
          backoff: 'exponential',
          removeOnComplete: 10,
          removeOnFail: 10,
        }
      );

      return job;
    } catch (error) {
      logger.error('Failed to queue single email:', error);
      throw error;
    }
  }

  /**
   * Process single email job
   */
  async processSingleEmailJob(job) {
    const {
      campaignId,
      recipientId,
      recipientEmail,
      templateId,
      identityId,
      variables,
      tenantId,
    } = job.data;

    try {
      // Get required data
      const [template, identity, tenant] = await Promise.all([
        prisma.template.findUnique({ where: { id: templateId } }),
        prisma.identity.findUnique({ where: { id: identityId } }),
        prisma.tenant.findUnique({ where: { id: tenantId } }),
      ]);

      if (!template || !identity || !tenant) {
        throw new Error('Required data not found');
      }

      // Render template with variables
      const renderedContent = await templateService.renderTemplate(
        templateId,
        variables,
        tenantId
      );

      // Create email log entry
      const emailLog = await prisma.emailLog.create({
        data: {
          campaignId,
          recipientEmail,
          subject: renderedContent.subject,
          htmlContent: renderedContent.htmlContent,
          textContent: renderedContent.textContent,
          status: 'SENDING',
          templateId,
          identityId,
          tenantId,
          applicationId: template.applicationId,
        },
      });

      // Send email via SES
      const sesResult = await sesService.sendEmail({
        fromEmail: identity.value,
        toEmails: [recipientEmail],
        subject: renderedContent.subject,
        htmlContent: renderedContent.htmlContent,
        textContent: renderedContent.textContent,
        configurationSetName: tenant.sesConfigurationSet,
        messageId: emailLog.id,
      });

      // Update email log with success
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sesMessageId: sesResult.MessageId,
          sentAt: new Date()
        }
      });

      // Update tenant email usage
      await tenantService.updateEmailUsage(tenantId, 1);

      logger.info('Email sent successfully', {
        emailLogId: emailLog.id,
        recipientEmail,
        sesMessageId: sesResult.MessageId,
      });

      return {
        status: 'sent',
        emailLogId: emailLog.id,
        sesMessageId: sesResult.MessageId,
      };
    } catch (error) {
      logger.error('Email sending failed:', error);

      let emailLogId = null;

      try {
        // Update email log with failure if it was created
        if (typeof emailLog !== 'undefined' && emailLog && emailLog.id) {
          emailLogId = emailLog.id;
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: 'FAILED',
              failureReason: error.message,
              failedAt: new Date(),
            },
          });
        } else {
          // Create failed email log if one wasn't created
          const failedEmailLog = await prisma.emailLog.create({
            data: {
              campaignId,
              recipientEmail,
              subject: 'Failed Email',
              htmlContent: '',
              textContent: '',
              status: 'FAILED',
              failureReason: error.message,
              failedAt: new Date(),
              templateId,
              identityId,
              tenantId,
            },
          });
          emailLogId = failedEmailLog.id;
        }

        // Update recipient status
        if (recipientId) {
          await prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: {
              status: 'FAILED',
              failureReason: error.message,
              failedAt: new Date(),
            },
          });
        }
      } catch (updateError) {
        logger.error('Failed to update failure status:', updateError);
      }

      throw error;
    }
  }

  /**
   * Queue bulk emails
   */
  async queueBulkEmails(emails, options = {}) {
    try {
      await this.initialize();

      const job = await queueService.addJob(
        'email',
        'send-bulk-email',
        {
          emails,
          batchSize: options.batchSize || 10,
        },
        options
      );

      logger.info('Bulk emails queued', {
        jobId: job.id,
        emailCount: emails.length,
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue bulk emails:', error);
      throw error;
    }
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId) {
    try {
      await this.initialize();

      // This would need to be implemented in the queue service
      // to find and cancel jobs by campaign ID
      logger.info('Campaign cancellation requested', { campaignId });

      // For now, just update the campaign status
      // The queue processors will check campaign status before processing
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      logger.info('Campaign cancelled', { campaignId });
    } catch (error) {
      logger.error('Failed to cancel campaign:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      await this.initialize();
      return await queueService.getAllQueueStats();
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Queue identity verification
   */
  async queueIdentityVerification(identityId) {
    try {
      await this.initialize();

      const job = await queueService.addJob(
        'verification',
        'verify-identity',
        { identityId },
        {
          attempts: 3,
          backoff: 'exponential',
        }
      );

      logger.info('Identity verification queued', {
        identityId,
        jobId: job.id,
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue identity verification:', error);
      throw error;
    }
  }

  /**
   * Queue billing usage tracking
   */
  async queueBillingUsage(tenantId, usageData) {
    try {
      await this.initialize();

      const job = await queueService.addJob(
        'billing',
        'process-usage',
        { tenantId, usageData },
        {
          attempts: 3,
          removeOnComplete: 100,
        }
      );

      return job;
    } catch (error) {
      logger.error('Failed to queue billing usage:', error);
      throw error;
    }
  }
}

export const emailQueueService = new EmailQueueService();