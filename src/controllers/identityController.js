
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sesService } from '../services/sesService.js';
import { validateEmail, validateDomain } from '../middleware/validation.js';

/**
 * Create a new identity (email or domain)
 */
export const createIdentity = async (req, res) => {
  try {
    const { applicationId, type, value } = req.body;
    const { tenantId } = req.user;

    // Validate input
    if (!applicationId || !type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Application ID, type, and value are required',
      });
    }

    // Validate identity type and value format
    if (type === 'EMAIL' && !validateEmail(value)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (type === 'DOMAIN' && !validateDomain(value)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain format',
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

    // Check if identity already exists for this tenant
    const existingIdentity = await prisma.identity.findFirst({
      where: {
        value: value.toLowerCase(),
        tenantId,
      },
    });

    if (existingIdentity) {
      return res.status(409).json({
        success: false,
        message: 'Identity already exists for this organization',
      });
    }

    // Create identity
    const identity = await prisma.identity.create({
      data: {
        type,
        value: value.toLowerCase(),
        applicationId,
        tenantId,
        status: 'PENDING',
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

    // Initiate SES verification
    try {
      const verificationResult = await sesService.verifyIdentity(
        identity.value,
        identity.type,
        tenantId
      );

      await prisma.identity.update({
        where: { id: identity.id },
        data: {
          sesIdentityArn: verificationResult.identityArn,
          verificationToken: verificationResult.verificationToken,
          dkimTokens: verificationResult.dkimTokens || [],
          dkimRecords: verificationResult.dkimRecords || null,
          spfRecord: verificationResult.spfRecord || null,
          dmarcRecord: verificationResult.dmarcRecord || null,
        },
      });

      logger.info('Identity verification initiated', {
        identityId: identity.id,
        type: identity.type,
        value: identity.value,
        applicationId,
        tenantId,
      });
    } catch (sesError) {
      logger.error('SES verification initiation failed:', sesError);
      // Don't fail the request, just log the error
    }

    res.status(201).json({
      success: true,
      message: 'Identity created successfully. Verification process initiated.',
      data: {
        identity,
      },
    });
  } catch (error) {
    logger.error('Create identity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create identity',
    });
  }
};

/**
 * Get identities for an application
 */
export const getIdentities = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { tenantId } = req.user;
    const { status, type } = req.query;

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

    const where = {
      applicationId,
      tenantId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const identities = await prisma.identity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        identities,
      },
    });
  } catch (error) {
    logger.error('Get identities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch identities',
    });
  }
};

/**
 * Get identity by ID
 */
export const getIdentityById = async (req, res) => {
  try {
    const { identityId } = req.params;
    const { tenantId } = req.user;

    const identity = await prisma.identity.findFirst({
      where: {
        id: identityId,
        tenantId,
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

    if (!identity) {
      return res.status(404).json({
        success: false,
        message: 'Identity not found',
      });
    }

    res.json({
      success: true,
      data: {
        identity,
      },
    });
  } catch (error) {
    logger.error('Get identity by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch identity',
    });
  }
};

/**
 * Check identity verification status
 */
export const checkVerificationStatus = async (req, res) => {
  try {
    const { identityId } = req.params;
    const { tenantId } = req.user;

    const identity = await prisma.identity.findFirst({
      where: {
        id: identityId,
        tenantId,
      },
    });

    if (!identity) {
      return res.status(404).json({
        success: false,
        message: 'Identity not found',
      });
    }

    // Always check the verification status with SES
    let verificationStatus = null;
    let updatedIdentity = identity; // Start with the current identity

    try {
      verificationStatus = await sesService.getIdentityVerificationStatus(
        identity.value,
        identity.type
      );

      // Update the local database status if it has changed
      if (verificationStatus && verificationStatus.status !== identity.status) {
        updatedIdentity = await prisma.identity.update({
          where: { id: identityId },
          data: {
            status: verificationStatus.status,
            verifiedAt: verificationStatus.status === 'VERIFIED' ? new Date() : null,
            lastVerificationCheck: new Date(),
          },
        });
      }
    } catch (sesError) {
      logger.error('Failed to check SES verification status:', sesError);
    }

    res.json({
      success: true,
      data: {
        identity: {
          id: updatedIdentity.id,
          value: updatedIdentity.value,
          type: updatedIdentity.type,
          status: updatedIdentity.status, // Return the potentially updated status
          verifiedAt: updatedIdentity.verifiedAt,
          lastVerificationCheck: new Date(),
        },
        verification: verificationStatus,
      },
    });
  } catch (error) {
    logger.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
    });
  }
};

/**
 * Delete identity
 */
export const deleteIdentity = async (req, res) => {
  try {
    const { identityId } = req.params;
    const { tenantId } = req.user;

    const identity = await prisma.identity.findFirst({
      where: {
        id: identityId,
        tenantId,
      },
      include: {
        _count: {
          select: {
            emailLogs: true,
          },
        },
        defaultForApps: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!identity) {
      return res.status(404).json({
        success: false,
        message: 'Identity not found',
      });
    }

    // Check if identity is being used as default for any applications
    if (identity.defaultForApps.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete identity that is set as default for applications',
        data: {
          applications: identity.defaultForApps,
        },
      });
    }

    // Check if identity has email history
    if (identity._count.emailLogs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete identity with email history',
        data: {
          emailCount: identity._count.emailLogs,
        },
      });
    }

    // Remove identity from SES if it exists
    if (identity.sesIdentityArn) {
      try {
        await sesService.deleteIdentity(identity.value, identity.type);
      } catch (sesError) {
        logger.error('Failed to delete SES identity:', sesError);
        // Continue with local deletion even if SES deletion fails
      }
    }

    // Delete identity
    await prisma.identity.delete({
      where: { id: identityId },
    });

    logger.info('Identity deleted successfully', {
      identityId,
      value: identity.value,
      type: identity.type,
      tenantId,
    });

    res.json({
      success: true,
      message: 'Identity deleted successfully',
    });
  } catch (error) {
    logger.error('Delete identity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete identity',
    });
  }
};

/**
 * Get DNS records for domain identity verification
 */
export const getDnsRecords = async (req, res) => {
  try {
    const { identityId } = req.params;
    const { tenantId } = req.user;

    const identity = await prisma.identity.findFirst({
      where: {
        id: identityId,
        tenantId,
        type: 'DOMAIN',
      },
    });

    if (!identity) {
      return res.status(404).json({
        success: false,
        message: 'Domain identity not found',
      });
    }

    const dnsRecords = {
      verification: {
        name: `_amazonses.${identity.value}`,
        type: 'TXT',
        value: identity.verificationToken,
        description: 'Required for domain ownership verification',
      },
      dkim: identity.dkimTokens?.map((token, index) => ({
        name: `${token}._domainkey.${identity.value}`,
        type: 'CNAME',
        value: `${token}.dkim.amazonses.com`,
        description: `DKIM record ${index + 1}`,
      })) || [],
      spf: identity.spfRecord ? {
        name: identity.value,
        type: 'TXT',
        value: identity.spfRecord,
        description: 'SPF record for email authentication',
      } : null,
      dmarc: identity.dmarcRecord ? {
        name: `_dmarc.${identity.value}`,
        type: 'TXT',
        value: identity.dmarcRecord,
        description: 'DMARC policy record',
      } : null,
    };

    res.json({
      success: true,
      data: {
        domain: identity.value,
        dnsRecords,
        instructions: {
          verification: 'Add the verification TXT record to prove domain ownership',
          dkim: 'Add all DKIM CNAME records to enable email signing',
          spf: 'Add the SPF TXT record to authorize email sending (optional but recommended)',
          dmarc: 'Add the DMARC TXT record to set email authentication policy (optional but recommended)',
        },
      },
    });
  } catch (error) {
    logger.error('Get DNS records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DNS records',
    });
  }
};
