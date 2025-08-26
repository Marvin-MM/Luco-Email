
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { tenantService } from '../services/tenantService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get current tenant info
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const tenant = await tenantService.getTenantById(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: { tenant }
    });
  } catch (error) {
    logger.error('Get current tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant information'
    });
  }
});

// Update tenant settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const updates = req.body;

    const updatedTenant = await tenantService.updateTenant(tenantId, updates);

    res.json({
      success: true,
      data: { tenant: updatedTenant }
    });
  } catch (error) {
    logger.error('Update tenant settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant settings'
    });
  }
});

// Get tenant usage statistics
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const usage = await tenantService.getTenantUsage(tenantId);

    res.json({
      success: true,
      data: { usage }
    });
  } catch (error) {
    logger.error('Get tenant usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant usage'
    });
  }
});

export default router;
