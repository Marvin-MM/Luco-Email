
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Generate a new API key
 */
export const createApiKey = async (req, res) => {
  try {
    const { name, description, permissions, expiresIn, rateLimit, ipWhitelist } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Generate a secure API key
    const apiKey = `luco_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 12); // First 12 characters for identification

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    }

    // Validate permissions
    const validPermissions = [
      'send_email',
      'manage_templates', 
      'manage_identities',
      'view_analytics',
      'manage_campaigns',
      'admin'
    ];
    
    const invalidPermissions = permissions?.filter(p => !validPermissions.includes(p)) || [];
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permissions: ${invalidPermissions.join(', ')}`,
        error: { type: 'InvalidPermissions', code: 400 }
      });
    }

    // Create API key record
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        name,
        description,
        keyHash,
        keyPrefix,
        permissions: permissions || ['send_email'],
        rateLimit: rateLimit || 1000,
        ipWhitelist: ipWhitelist || [],
        expiresAt,
        tenantId,
        userId
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
        isActive: true
      }
    });

    logger.info('API key created', {
      userId,
      tenantId,
      apiKeyId: apiKeyRecord.id,
      keyPrefix
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        apiKey, // Return the actual key only once
        keyInfo: apiKeyRecord
      }
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key',
      error: { type: 'ServerError', code: 500 }
    });
  }
};

/**
 * List user's API keys
 */
export const getApiKeys = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId };
    if (status) {
      where.isActive = status === 'active';
    }

    const apiKeys = await prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        rateLimit: true,
        totalRequests: true,
        description: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.apiKey.count({ where });

    res.json({
      success: true,
      data: {
        apiKeys,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API keys',
      error: { type: 'ServerError', code: 500 }
    });
  }
};

/**
 * Get API key details and usage statistics
 */
export const getApiKeyById = async (req, res) => {
  try {
    const { apiKeyId } = req.params;
    const userId = req.user.id;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        rateLimit: true,
        totalRequests: true,
        requestsThisHour: true,
        lastResetAt: true,
        description: true,
        ipWhitelist: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
        error: { type: 'NotFound', code: 404 }
      });
    }

    // Get usage statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageStats = await prisma.apiKeyUsage.groupBy({
      by: ['createdAt'],
      where: {
        apiKeyId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true,
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: {
        apiKey,
        usageStats
      }
    });
  } catch (error) {
    logger.error('Error fetching API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API key',
      error: { type: 'ServerError', code: 500 }
    });
  }
};

/**
 * Update API key
 */
export const updateApiKey = async (req, res) => {
  try {
    const { apiKeyId } = req.params;
    const { name, description, permissions, isActive, rateLimit, ipWhitelist } = req.body;
    const userId = req.user.id;

    const existingKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId }
    });

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
        error: { type: 'NotFound', code: 404 }
      });
    }

    // Validate permissions if provided
    if (permissions) {
      const validPermissions = [
        'send_email',
        'manage_templates', 
        'manage_identities',
        'view_analytics',
        'manage_campaigns',
        'admin'
      ];
      
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          error: { type: 'InvalidPermissions', code: 400 }
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
    if (ipWhitelist !== undefined) updateData.ipWhitelist = ipWhitelist;

    const updatedKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        rateLimit: true,
        description: true,
        ipWhitelist: true,
        updatedAt: true
      }
    });

    logger.info('API key updated', {
      userId,
      apiKeyId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'API key updated successfully',
      data: updatedKey
    });
  } catch (error) {
    logger.error('Error updating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API key',
      error: { type: 'ServerError', code: 500 }
    });
  }
};

/**
 * Delete API key
 */
export const deleteApiKey = async (req, res) => {
  try {
    const { apiKeyId } = req.params;
    const userId = req.user.id;

    const existingKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId }
    });

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
        error: { type: 'NotFound', code: 404 }
      });
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId }
    });

    logger.info('API key deleted', {
      userId,
      apiKeyId,
      keyPrefix: existingKey.keyPrefix
    });

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key',
      error: { type: 'ServerError', code: 500 }
    });
  }
};

/**
 * Get API key usage logs
 */
export const getApiKeyUsage = async (req, res) => {
  try {
    const { apiKeyId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    const userId = req.user.id;

    // Verify API key belongs to user
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
        error: { type: 'NotFound', code: 404 }
      });
    }

    const where = { apiKeyId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const usageLogs = await prisma.apiKeyUsage.findMany({
      where,
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        responseTime: true,
        ipAddress: true,
        requestSize: true,
        responseSize: true,
        errorMessage: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.apiKeyUsage.count({ where });

    res.json({
      success: true,
      data: {
        usageLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching API key usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage logs',
      error: { type: 'ServerError', code: 500 }
    });
  }
};
