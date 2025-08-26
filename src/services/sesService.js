import * as SESv2 from '@aws-sdk/client-sesv2';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

class SESService {
  constructor() {
    this.client = new SESv2.SESv2Client({ // <-- Add "SESv2."
      region: config.aws.region || process.env.AWS_REGION,
      credentials: {
        accessKeyId: config.aws.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.aws.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  /**
   * Create a configuration set for tenant isolation
   */
  async createConfigurationSet(configurationSetName, metadata = {}) {
    try {
      const command = new SESv2.CreateConfigurationSetCommand({
        ConfigurationSetName: configurationSetName,
        Tags: [
          {
            Key: 'Service',
            Value: 'Luco'
          },
          {
            Key: 'TenantId',
            Value: metadata.tenantId || 'unknown'
          },
          {
            Key: 'Organization',
            Value: metadata.organizationName || 'unknown'
          }
        ]
      });

      const result = await this.client.send(command);
      logger.info(`Created SES configuration set: ${configurationSetName}`);

      // Set up event publishing for tracking
      await this.setupEventDestination(configurationSetName);

      return result;
    } catch (error) {
      logger.error(`Failed to create configuration set ${configurationSetName}:`, error);
      throw new Error(`Failed to create SES configuration set: ${error.message}`);
    }
  }

  /**
   * Set up event destination for tracking email events
   */
  async setupEventDestination(configurationSetName) {
    try {
      // Define the destination settings. Note the 'Name' property is removed.
      const eventDestination = {
        Enabled: true,
        MatchingEventTypes: [
          'SEND',
          'BOUNCE',
          'COMPLAINT',
          'DELIVERY',
          'REJECT',
          'OPEN',
          'CLICK'
        ],
        // Always include a default destination. CloudWatch is a good choice.
        CloudWatchDestination: {
          DimensionConfigurations: [
            {
              DimensionName: 'MessageTag',
              DimensionValueSource: 'MESSAGE_TAG',
              DefaultDimensionValue: 'default'
            }
          ]
        }
      };

      const command = new SESv2.CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: configurationSetName,
        EventDestinationName: 'luco-events-destination',
        EventDestination: eventDestination
      });

      await this.client.send(command);
      logger.info(`Event destination set up for configuration set: ${configurationSetName}`);
    } catch (error) {
      logger.error(`Failed to set up event destination for ${configurationSetName}:`, error);
      // Don't throw error as this is not critical for basic functionality
    }
  }

  /**
   * Create and verify email identity
   */
  // async createEmailIdentity(emailAddress) {
  //   try {
  //     const command = new SESv2.CreateEmailIdentityCommand({
  //       EmailIdentity: emailAddress,
  //       DkimSigningAttributes: {
  //         DomainSigningSelector: 'luco',
  //         DomainSigningPrivateKey: config.dkimPrivateKey || process.env.DKIM_PRIVATE_KEY,
  //         NextSigningKeyLength: 'RSA_2048_BIT'
  //       }
  //     });

  //     const result = await this.client.send(command);
  //     logger.info(`Created email identity: ${emailAddress}`);
  //     return result;
  //   } catch (error) {
  //     logger.error(`Failed to create email identity ${emailAddress}:`, error);
  //     throw new Error(`Failed to create email identity: ${error.message}`);
  //   }
  // }

  // /**
  //  * Get email identity verification status
  //  */
  // async getEmailIdentityStatus(emailAddress) {
  //   try {
  //     const command = new SESv2.GetEmailIdentityCommand({
  //       EmailIdentity: emailAddress
  //     });

  //     const result = await this.client.send(command);
  //     return {
  //       verified: result.VerifiedForSendingStatus,
  //       dkimStatus: result.DkimAttributes?.Status,
  //       dkimTokens: result.DkimAttributes?.Tokens || []
  //     };
  //   } catch (error) {
  //     logger.error(`Failed to get email identity status for ${emailAddress}:`, error);
  //     throw new Error(`Failed to get email identity status: ${error.message}`);
  //   }
  // }

/**
   * Create an email identity and begin the verification process.
   * This command is idempotent, so it can be called safely for existing identities.
   */
async verifyIdentity(identity, type, tenantId) {
  try {
    // Use CreateEmailIdentityCommand to create the identity and get verification tokens.
    // We are letting AWS handle DKIM generation (Easy DKIM), which is standard.
    const command = new SESv2.CreateEmailIdentityCommand({
      EmailIdentity: identity,
      Tags: [
        { Key: 'TenantId', Value: tenantId },
        { Key: 'IdentityType', Value: type }
      ]
    });

    const result = await this.client.send(command);

    let verificationData = {
      identityArn: null, // ARN is not returned on this command, can be constructed if needed
      verificationToken: null,
      dkimTokens: result.DkimAttributes?.Tokens || [],
      dkimRecords: null,
      spfRecord: `v=spf1 include:amazonses.com ~all`,
      dmarcRecord: `v=DMARC1; p=none; rua=mailto:dmarc@${identity}`
    };
    
    // For domain identities, construct the DNS records from the generated DKIM tokens
    if (type === 'DOMAIN' && verificationData.dkimTokens.length > 0) {
      // For domains, SES does not provide a separate verification token for the root domain itself via this command.
      // Verification is achieved by publishing the DKIM records.
      verificationData.dkimRecords = verificationData.dkimTokens.map(token => ({
        name: `${token}._domainkey.${identity}`,
        type: 'CNAME',
        value: `${token}.dkim.amazonses.com`
      }));
    }

    logger.info(`Identity verification initiated for: ${identity}`);
    return verificationData;

  } catch (error) {
    logger.error(`Failed to initiate verification for identity ${identity}:`, error);
    throw new Error(`Failed to initiate verification: ${error.message}`);
  }
}

  /**
   * Get identity verification status
   */
  async getIdentityVerificationStatus(identity, type) {
    try {
      const command = new SESv2.GetEmailIdentityCommand({
        EmailIdentity: identity
      });

      const result = await this.client.send(command);

      let status = 'PENDING';
      if (result.VerifiedForSendingStatus) {
        status = 'VERIFIED';
      } else if (result.VerificationInfo && result.VerificationInfo.ErrorType) {
        status = 'FAILED';
      }

      return {
        status,
        verifiedForSending: result.VerifiedForSendingStatus,
        dkimStatus: result.DkimAttributes?.Status,
        errorType: result.VerificationInfo?.ErrorType,
        errorMessage: result.VerificationInfo?.ErrorMessage,
      };
    } catch (error) {
      logger.error(`Failed to get verification status for ${identity}:`, error);
      return {
        status: 'FAILED',
        error: error.message
      };
    }
  }

  /**
   * Delete an identity
   */
  async deleteIdentity(identity, type) {
    try {
      const command = new SESv2.DeleteEmailIdentityCommand({
        EmailIdentity: identity
      });

      await this.client.send(command);
      logger.info(`Identity deleted: ${identity} (${type})`);
    } catch (error) {
      logger.error(`Failed to delete identity ${identity}:`, error);
      throw new Error(`Failed to delete identity: ${error.message}`);
    }
  }

  /**
   * Send email through SES
   */
  async sendEmail({
    fromEmail,
    toEmails,
    subject,
    htmlContent,
    textContent,
    configurationSetName,
    messageId
  }) {
    try {
      const command = new SESv2.SendEmailCommand({
        FromEmailAddress: fromEmail,
        Destination: {
          ToAddresses: Array.isArray(toEmails) ? toEmails : [toEmails]
        },
        Content: {
          Simple: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8'
            },
            Body: {
              Html: htmlContent ? {
                Data: htmlContent,
                Charset: 'UTF-8'
              } : undefined,
              Text: textContent ? {
                Data: textContent,
                Charset: 'UTF-8'
              } : undefined
            }
          }
        },
        ConfigurationSetName: configurationSetName,
        Tags: [
          {
            Name: 'MessageId',
            Value: messageId || 'unknown'
          }
        ]
      });

      const result = await this.client.send(command);
      logger.info(`Email sent successfully via SES: ${result.MessageId}`);
      return result;
    } catch (error) {
      logger.error('Failed to send email via SES:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Get SES sending statistics
   */
  async getSendingStatistics() {
    try {
      // This would typically involve calling GetSendStatistics
      // For now, return placeholder
      return {
        bounce_rate: 0.01,
        complaint_rate: 0.001,
        reputation_bounce_rate: 0.05,
        reputation_complaint_rate: 0.001
      };
    } catch (error) {
      logger.error('Failed to get SES sending statistics:', error);
      throw new Error(`Failed to get sending statistics: ${error.message}`);
    }
  }
}

export const sesService = new SESService();