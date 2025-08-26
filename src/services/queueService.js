import Queue from 'bull';
import { redisManager } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { emailService } from './emailService.js';
import { sesService } from './sesService.js';
import { templateService } from './templateService.js';
import { prisma } from '../config/database.js';
import { config } from '../config/environment.js';

class QueueService {
  constructor() {
    this.queues = new Map();
    this.redisConfig = config.queue.redisUrl;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const redisConfig = {
        redis: {
          port: process.env.REDIS_PORT || 6379,
          host: process.env.REDIS_HOST || 'localhost',
          password: process.env.REDIS_PASSWORD,
        },
      };

      // Initialize queues
      this.queues.email = new Queue('email processing', this.redisConfig);
      this.queues.campaign = new Queue('campaign processing', this.redisConfig);
      this.queues.verification = new Queue('ses verification', this.redisConfig);
      this.queues.analytics = new Queue('analytics processing', this.redisConfig);
      this.queues.billing = new Queue('billing processing', this.redisConfig);

      // Set up job processors
      await this.setupProcessors();

      // Set up queue event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  async setupProcessors() {
    // Email processing
    this.queues.email.process('send-single-email', 10, async (job) => {
      return await this.processSingleEmail(job);
    });

    this.queues.email.process('send-bulk-email', 5, async (job) => {
      return await this.processBulkEmail(job);
    });

    // Campaign processing
    this.queues.campaign.process('process-campaign', 1, async (job) => {
      return await this.processCampaign(job);
    });

    this.queues.campaign.process('campaign-batch', 3, async (job) => {
      return await this.processCampaignBatch(job);
    });

    // SES verification
    this.queues.verification.process('verify-identity', 5, async (job) => {
      return await this.processIdentityVerification(job);
    });

    this.queues.verification.process('check-verification-status', 10, async (job) => {
      return await this.checkVerificationStatus(job);
    });

    // Analytics processing
    this.queues.analytics.process('generate-report', 2, async (job) => {
      return await this.processAnalyticsReport(job);
    });

    this.queues.analytics.process('update-metrics', 5, async (job) => {
      return await this.updateMetrics(job);
    });

    // Billing processing
    this.queues.billing.process('process-usage', 3, async (job) => {
      return await this.processBillingUsage(job);
    });

    this.queues.billing.process('generate-invoice', 1, async (job) => {
      return await this.generateInvoice(job);
    });
  }

  setupEventListeners() {
    Object.keys(this.queues).forEach(queueName => {
      const queue = this.queues[queueName];

      queue.on('completed', (job, result) => {
        logger.info(`Job completed in ${queueName}`, {
          jobId: job.id,
          jobType: job.name,
          processingTime: job.finishedOn - job.processedOn,
        });
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job failed in ${queueName}`, {
          jobId: job.id,
          jobType: job.name,
          error: err.message,
          attempts: job.attemptsMade,
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled in ${queueName}`, {
          jobId: job.id,
          jobType: job.name,
        });
      });
    });
  }

  // Email processing methods
  async processSingleEmail(job) {
    const {
      recipientEmail,
      subject,
      htmlContent,
      textContent,
      identityId,
      templateId,
      variables,
      tenantId,
      campaignId,
    } = job.data;

    try {
      // Get identity details
      const identity = await prisma.identity.findUnique({
        where: { id: identityId },
        include: { tenant: true },
      });

      if (!identity || identity.status !== 'VERIFIED') {
        throw new Error('Invalid or unverified sender identity');
      }

      // Process template if provided
      let finalHtmlContent = htmlContent;
      let finalTextContent = textContent;
      let finalSubject = subject;

      if (templateId && variables) {
        const processedTemplate = await templateService.processTemplate(
          templateId,
          variables
        );
        finalHtmlContent = processedTemplate.htmlContent;
        finalTextContent = processedTemplate.textContent;
        finalSubject = processedTemplate.subject;
      }

      // Send email via SES
      const result = await sesService.sendEmail({
        fromEmail: identity.value,
        toEmails: [recipientEmail],
        subject: finalSubject,
        htmlContent: finalHtmlContent,
        textContent: finalTextContent,
        configurationSetName: identity.tenant.sesConfigurationSet,
        messageId: `queue-${Date.now()}`,
      });

      // Log email in database
      await prisma.emailLog.create({
        data: {
          recipientEmail,
          subject: finalSubject,
          htmlContent: finalHtmlContent,
          textContent: finalTextContent,
          status: 'SENT',
          sesMessageId: result.MessageId,
          sentAt: new Date(),
          tenantId,
          campaignId,
          templateId,
          identityId,
        },
      });

      return {
        success: true,
        messageId: result.MessageId,
        recipientEmail,
      };
    } catch (error) {
      // Log failed email
      await prisma.emailLog.create({
        data: {
          recipientEmail,
          subject: subject || 'Failed Email',
          htmlContent: htmlContent || '',
          textContent: textContent || '',
          status: 'FAILED',
          failureReason: error.message,
          failedAt: new Date(),
          tenantId,
          campaignId,
          templateId,
          identityId,
        },
      });

      throw error;
    }
  }

  async processBulkEmail(job) {
    const { emails, batchSize = 10 } = job.data;
    const results = [];
    const failed = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchPromises = batch.map(async (emailData) => {
        try {
          const singleEmailJob = await this.queues.email.add(
            'send-single-email',
            emailData,
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            }
          );
          return { success: true, jobId: singleEmailJob.id };
        } catch (error) {
          failed.push({ email: emailData.recipientEmail, error: error.message });
          return { success: false, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to prevent overwhelming SES
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      totalProcessed: emails.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: failed.length,
      failedEmails: failed,
    };
  }

  async processCampaign(job) {
    const { campaignId, batchSize = 100, delayBetweenBatches = 5000 } = job.data;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          template: true,
          identity: true,
          tenant: true,
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Update campaign status
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENDING', sentAt: new Date() },
      });

      // Get all pending recipients
      const recipients = await prisma.campaignRecipient.findMany({
        where: { campaignId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });

      let processed = 0;
      const totalRecipients = recipients.length;

      // Process in batches
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        // Queue batch processing
        await this.queues.campaign.add(
          'campaign-batch',
          {
            campaignId,
            recipients: batch,
            campaign,
          },
          {
            attempts: 3,
            backoff: 'exponential',
          }
        );

        processed += batch.length;

        // Update progress
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { processed },
        });

        // Delay between batches
        if (i + batchSize < recipients.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      return {
        success: true,
        totalRecipients,
        batchesQueued: Math.ceil(totalRecipients / batchSize),
      };
    } catch (error) {
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

  async processCampaignBatch(job) {
    const { campaignId, recipients, campaign } = job.data;
    const results = [];

    for (const recipient of recipients) {
      try {
        // Mark recipient as queued
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'QUEUED', queuedAt: new Date() },
        });

        // Queue individual email
        const emailJob = await this.queues.email.add(
          'send-single-email',
          {
            recipientEmail: recipient.email,
            subject: campaign.subject,
            identityId: campaign.identityId,
            templateId: campaign.templateId,
            variables: {
              ...campaign.variables,
              ...recipient.variables,
            },
            tenantId: campaign.tenantId,
            campaignId,
          },
          {
            attempts: 3,
            backoff: 'exponential',
          }
        );

        // Update recipient status
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'SENT', sentAt: new Date() },
        });

        results.push({ success: true, recipientId: recipient.id });
      } catch (error) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            failureReason: error.message,
            failedAt: new Date(),
          },
        });

        results.push({
          success: false,
          recipientId: recipient.id,
          error: error.message,
        });
      }
    }

    return {
      batchSize: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }

  async processIdentityVerification(job) {
    const { identityId } = job.data;

    try {
      const identity = await prisma.identity.findUnique({
        where: { id: identityId },
        include: { tenant: true },
      });

      if (!identity) {
        throw new Error('Identity not found');
      }

      // Initiate SES verification
      const result = await sesService.verifyIdentity(
        identity.value,
        identity.type,
        identity.tenantId
      );

      // Update identity with verification details
      await prisma.identity.update({
        where: { id: identityId },
        data: {
          sesIdentityArn: result.identityArn,
          verificationToken: result.verificationToken,
          dkimTokens: result.dkimTokens || [],
          dkimRecords: result.dkimRecords || null,
          spfRecord: result.spfRecord || null,
          dmarcRecord: result.dmarcRecord || null,
          lastVerificationCheck: new Date(),
        },
      });

      // Schedule status check
      await this.queues.verification.add(
        'check-verification-status',
        { identityId },
        {
          delay: 30000, // Check after 30 seconds
          attempts: 10,
          backoff: 'exponential',
        }
      );

      return {
        success: true,
        verificationToken: result.verificationToken,
        dkimTokens: result.dkimTokens,
      };
    } catch (error) {
      await prisma.identity.update({
        where: { id: identityId },
        data: {
          status: 'FAILED',
          lastVerificationCheck: new Date(),
        },
      });
      throw error;
    }
  }

  async checkVerificationStatus(job) {
    const { identityId } = job.data;

    try {
      const identity = await prisma.identity.findUnique({
        where: { id: identityId },
      });

      if (!identity) {
        throw new Error('Identity not found');
      }

      // Check SES verification status
      const verificationStatus = await sesService.getIdentityVerificationStatus(
        identity.value,
        identity.type
      );

      const updateData = {
        lastVerificationCheck: new Date(),
      };

      if (verificationStatus.status === 'VERIFIED') {
        updateData.status = 'VERIFIED';
        updateData.verifiedAt = new Date();
      } else if (verificationStatus.status === 'FAILED') {
        updateData.status = 'FAILED';
      } else {
        // Still pending, schedule another check
        await this.queues.verification.add(
          'check-verification-status',
          { identityId },
          {
            delay: 60000, // Check again in 1 minute
            attempts: 5,
          }
        );
      }

      await prisma.identity.update({
        where: { id: identityId },
        data: updateData,
      });

      return {
        success: true,
        status: updateData.status || 'PENDING',
        isVerified: verificationStatus.status === 'VERIFIED',
      };
    } catch (error) {
      logger.error('Verification status check failed:', error);
      throw error;
    }
  }

  async processAnalyticsReport(job) {
    const { tenantId, reportType, parameters } = job.data;

    try {
      // This would integrate with the analytics service
      // Implementation depends on specific report requirements
      logger.info('Processing analytics report', {
        tenantId,
        reportType,
        parameters,
      });

      // Placeholder for report generation logic
      return {
        success: true,
        reportType,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Analytics report processing failed:', error);
      throw error;
    }
  }

  async updateMetrics(job) {
    const { tenantId, metricType, data } = job.data;

    try {
      // Update tenant metrics based on email activity
      logger.info('Updating metrics', { tenantId, metricType });

      // Implementation would update relevant metrics in database
      return {
        success: true,
        metricType,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Metrics update failed:', error);
      throw error;
    }
  }

  async processBillingUsage(job) {
    const { tenantId, usageData } = job.data;

    try {
      // Track usage for billing purposes
      await prisma.usageEvent.create({
        data: {
          tenantId,
          eventType: usageData.eventType,
          eventData: usageData,
          timestamp: new Date(),
        },
      });

      return {
        success: true,
        eventType: usageData.eventType,
        recordedAt: new Date(),
      };
    } catch (error) {
      logger.error('Billing usage processing failed:', error);
      throw error;
    }
  }

  async generateInvoice(job) {
    const { tenantId, billingPeriod } = job.data;

    try {
      // Generate invoice for billing period
      logger.info('Generating invoice', { tenantId, billingPeriod });

      // Implementation would calculate usage and generate invoice
      return {
        success: true,
        billingPeriod,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Invoice generation failed:', error);
      throw error;
    }
  }

  // Queue management methods
  async addJob(queueName, jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.add(jobType, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
      ...options,
    });
  }

  async getQueueStats(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return {
      waiting: await queue.getWaiting(),
      active: await queue.getActive(),
      completed: await queue.getCompleted(),
      failed: await queue.getFailed(),
      delayed: await queue.getDelayed(),
    };
  }

  async getAllQueueStats() {
    const stats = {};
    for (const queueName of Object.keys(this.queues)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    return stats;
  }

  async pauseQueue(queueName) {
    const queue = this.queues[queueName];
    if (queue) {
      await queue.pause();
      logger.info(`Queue ${queueName} paused`);
    }
  }

  async resumeQueue(queueName) {
    const queue = this.queues[queueName];
    if (queue) {
      await queue.resume();
      logger.info(`Queue ${queueName} resumed`);
    }
  }

  async cleanup() {
    try {
      for (const queueName of Object.keys(this.queues)) {
        await this.queues[queueName].close();
        logger.info(`Queue ${queueName} closed`);
      }
      this.isInitialized = false;
    } catch (error) {
      logger.error('Queue cleanup failed:', error);
    }
  }
}

export const queueService = new QueueService();