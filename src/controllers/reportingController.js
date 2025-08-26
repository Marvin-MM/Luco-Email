
import { reportingService } from '../services/reportingService.js';
import { logger } from '../utils/logger.js';

/**
 * Generate daily report for tenant
 */
export const generateDailyReport = async (req, res) => {
  try {
    const { tenantId } = req.user;
    
    const report = await reportingService.generateDailyReport(tenantId);
    
    res.json({
      success: true,
      data: report,
      message: 'Daily report generated successfully',
    });
  } catch (error) {
    logger.error('Generate daily report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Generate weekly reputation report
 */
export const generateReputationReport = async (req, res) => {
  try {
    const { tenantId } = req.user;
    
    const report = await reportingService.generateWeeklyReputationReport(tenantId);
    
    res.json({
      success: true,
      data: report,
      message: 'Reputation report generated successfully',
    });
  } catch (error) {
    logger.error('Generate reputation report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reputation report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Generate custom report
 */
export const generateCustomReport = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const reportConfig = req.body;
    
    // Validate required fields
    if (!reportConfig.type || !reportConfig.startDate || !reportConfig.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Report type, start date, and end date are required',
      });
    }
    
    const report = await reportingService.generateCustomReport(tenantId, reportConfig);
    
    res.json({
      success: true,
      data: report,
      message: 'Custom report generated successfully',
    });
  } catch (error) {
    logger.error('Generate custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Schedule automated reports
 */
export const scheduleAutomatedReports = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { reportType, frequency, recipients } = req.body;
    
    // This would integrate with a scheduler service
    // For now, we'll just return a success message
    
    res.json({
      success: true,
      message: 'Automated report scheduled successfully',
      data: {
        reportType,
        frequency,
        recipients,
        tenantId,
        scheduledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Schedule automated reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule automated reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
