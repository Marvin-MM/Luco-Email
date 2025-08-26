
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sesService } from './sesService.js';
import { analyticsService } from './analyticsService.js';

class ReportingService {
  /**
   * Generate and send daily usage report
   */
  async generateDailyReport(tenantId) {
    try {
      logger.info('Generating daily report', { tenantId });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Get tenant information
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: {
            where: { role: 'USER' },
            select: { email: true, firstName: true, lastName: true },
          },
        },
      });

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      // Calculate daily metrics
      const dailyMetrics = await analyticsService.calculateEmailMetrics(tenantId, {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      });

      // Get campaign activity
      const campaigns = await prisma.campaign.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
          totalRecipients: true,
          successful: true,
          failed: true,
        },
      });

      // Get monthly usage
      const monthlyUsage = await analyticsService.calculateTenantUsage(tenantId);

      // Generate report content
      const reportData = {
        date: yesterday.toISOString().split('T')[0],
        tenant: {
          name: tenant.organizationName,
          plan: tenant.subscriptionPlan,
        },
        daily: {
          emailsSent: dailyMetrics.counts.total,
          deliveryRate: dailyMetrics.rates.delivery,
          bounceRate: dailyMetrics.rates.bounce,
          campaignsLaunched: campaigns.filter(c => c.status === 'SENT').length,
        },
        monthly: {
          usage: monthlyUsage.usage.emailsSent,
          limit: monthlyUsage.limits.monthlyEmails,
          utilization: monthlyUsage.utilization.emails,
        },
        campaigns: campaigns.slice(0, 5), // Top 5 campaigns
      };

      // Send report to all tenant users
      for (const user of tenant.users) {
        await this.sendDailyReportEmail(user, reportData);
      }

      logger.info('Daily report generated successfully', { 
        tenantId, 
        recipientCount: tenant.users.length 
      });

      return reportData;
    } catch (error) {
      logger.error('Generate daily report error:', error);
      throw error;
    }
  }

  /**
   * Send daily report email
   */
  async sendDailyReportEmail(user, reportData) {
    try {
      const subject = `Daily Email Report - ${reportData.date}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .metric { background-color: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .metric h3 { margin: 0 0 5px 0; color: #1e293b; }
            .metric .value { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .campaign-list { margin-top: 20px; }
            .campaign-item { border-left: 4px solid #4f46e5; padding-left: 15px; margin: 10px 0; }
            .footer { background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Email Report</h1>
            <p>${reportData.date} - ${reportData.tenant.name}</p>
          </div>
          
          <div class="content">
            <h2>Yesterday's Performance</h2>
            
            <div class="metric">
              <h3>Emails Sent</h3>
              <div class="value">${reportData.daily.emailsSent.toLocaleString()}</div>
            </div>
            
            <div class="metric">
              <h3>Delivery Rate</h3>
              <div class="value">${reportData.daily.deliveryRate}%</div>
            </div>
            
            <div class="metric">
              <h3>Bounce Rate</h3>
              <div class="value">${reportData.daily.bounceRate}%</div>
            </div>
            
            <div class="metric">
              <h3>Campaigns Launched</h3>
              <div class="value">${reportData.daily.campaignsLaunched}</div>
            </div>
            
            <h2>Monthly Usage</h2>
            <div class="metric">
              <h3>Email Usage</h3>
              <div class="value">${reportData.monthly.usage.toLocaleString()} / ${reportData.monthly.limit.toLocaleString()}</div>
              <p>${reportData.monthly.utilization.toFixed(1)}% of monthly limit used</p>
            </div>
            
            ${reportData.campaigns.length > 0 ? `
              <h2>Recent Campaigns</h2>
              <div class="campaign-list">
                ${reportData.campaigns.map(campaign => `
                  <div class="campaign-item">
                    <strong>${campaign.name}</strong><br>
                    Status: ${campaign.status} | 
                    Recipients: ${campaign.totalRecipients?.toLocaleString() || 'N/A'} |
                    Success Rate: ${campaign.totalRecipients > 0 ? ((campaign.successful / campaign.totalRecipients) * 100).toFixed(1) : 'N/A'}%
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated report from Luco Email Platform</p>
            <p>Visit your dashboard for detailed analytics and insights</p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Daily Email Report - ${reportData.date}
        
        Yesterday's Performance:
        - Emails Sent: ${reportData.daily.emailsSent.toLocaleString()}
        - Delivery Rate: ${reportData.daily.deliveryRate}%
        - Bounce Rate: ${reportData.daily.bounceRate}%
        - Campaigns Launched: ${reportData.daily.campaignsLaunched}
        
        Monthly Usage:
        - Email Usage: ${reportData.monthly.usage.toLocaleString()} / ${reportData.monthly.limit.toLocaleString()}
        - Utilization: ${reportData.monthly.utilization.toFixed(1)}%
        
        Recent Campaigns:
        ${reportData.campaigns.map(campaign => 
          `- ${campaign.name} (${campaign.status})`
        ).join('\n')}
        
        This is an automated report from Luco Email Platform.
      `;

      // Get a system identity for sending reports
      const systemIdentity = await prisma.identity.findFirst({
        where: {
          tenantId: '00000000-0000-0000-0000-000000000001', // System tenant
          status: 'VERIFIED',
        },
      });

      if (systemIdentity) {
        await sesService.sendEmail({
          fromEmail: systemIdentity.value,
          toEmails: [user.email],
          subject,
          htmlContent,
          textContent,
          configurationSetName: 'luco-system-reports',
        });
      }

      logger.info('Daily report email sent', { 
        recipient: user.email,
        date: reportData.date 
      });
    } catch (error) {
      logger.error('Send daily report email error:', error);
      throw error;
    }
  }

  /**
   * Generate weekly reputation report
   */
  async generateWeeklyReputationReport(tenantId) {
    try {
      logger.info('Generating weekly reputation report', { tenantId });

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: {
            where: { role: 'USER' },
            select: { email: true, firstName: true, lastName: true },
          },
        },
      });

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      // Generate reputation report
      const reputationReport = await analyticsService.generateReputationReport(tenantId);

      // Send report to all tenant users
      for (const user of tenant.users) {
        await this.sendReputationReportEmail(user, reputationReport, tenant);
      }

      logger.info('Weekly reputation report generated', { 
        tenantId, 
        score: reputationReport.score,
        riskLevel: reputationReport.riskLevel 
      });

      return reputationReport;
    } catch (error) {
      logger.error('Generate weekly reputation report error:', error);
      throw error;
    }
  }

  /**
   * Send reputation report email
   */
  async sendReputationReportEmail(user, reputationReport, tenant) {
    try {
      const subject = `Weekly Reputation Report - Score: ${reputationReport.score}/100`;
      
      const riskColor = {
        LOW: '#10b981',
        MEDIUM: '#f59e0b',
        HIGH: '#ef4444',
      }[reputationReport.riskLevel];

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .score-box { background-color: #f8fafc; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
            .score { font-size: 48px; font-weight: bold; color: ${riskColor}; }
            .risk-level { font-size: 18px; color: ${riskColor}; font-weight: bold; }
            .metric { background-color: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .issues { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
            .recommendations { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            .recommendation-item { margin: 10px 0; padding: 10px; background-color: white; border-radius: 5px; }
            .priority-high { border-left: 3px solid #ef4444; }
            .priority-medium { border-left: 3px solid #f59e0b; }
            .footer { background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Weekly Reputation Report</h1>
            <p>${tenant.organizationName}</p>
          </div>
          
          <div class="score-box">
            <div class="score">${reputationReport.score}/100</div>
            <div class="risk-level">Risk Level: ${reputationReport.riskLevel}</div>
          </div>
          
          <div style="padding: 20px;">
            <h2>Performance Metrics (Last 30 Days)</h2>
            
            <div class="metric">
              <strong>Delivery Rate:</strong> ${reputationReport.metrics.rates.delivery}%
            </div>
            
            <div class="metric">
              <strong>Bounce Rate:</strong> ${reputationReport.metrics.rates.bounce}%
            </div>
            
            <div class="metric">
              <strong>Complaint Rate:</strong> ${reputationReport.metrics.rates.complaint}%
            </div>
            
            <div class="metric">
              <strong>Open Rate:</strong> ${reputationReport.metrics.rates.open}%
            </div>
            
            ${reputationReport.issues.length > 0 ? `
              <div class="issues">
                <h3>Issues Detected</h3>
                <ul>
                  ${reputationReport.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${reputationReport.recommendations.length > 0 ? `
              <div class="recommendations">
                <h3>Recommendations</h3>
                ${reputationReport.recommendations.map(rec => `
                  <div class="recommendation-item priority-${rec.priority.toLowerCase()}">
                    <strong>${rec.action}</strong><br>
                    <small>${rec.description}</small>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This report is generated weekly to help you maintain good sender reputation.</p>
            <p>Visit your dashboard for detailed analytics and real-time monitoring.</p>
          </div>
        </body>
        </html>
      `;

      // Get a system identity for sending reports
      const systemIdentity = await prisma.identity.findFirst({
        where: {
          tenantId: '00000000-0000-0000-0000-000000000001', // System tenant
          status: 'VERIFIED',
        },
      });

      if (systemIdentity) {
        await sesService.sendEmail({
          fromEmail: systemIdentity.value,
          toEmails: [user.email],
          subject,
          htmlContent,
          configurationSetName: 'luco-system-reports',
        });
      }

      logger.info('Reputation report email sent', { 
        recipient: user.email,
        score: reputationReport.score 
      });
    } catch (error) {
      logger.error('Send reputation report email error:', error);
      throw error;
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(tenantId, reportConfig) {
    try {
      const {
        type,
        startDate,
        endDate,
        filters = {},
        includeDetails = false,
      } = reportConfig;

      let reportData = {};

      switch (type) {
        case 'email_performance':
          reportData = await analyticsService.calculateEmailMetrics(tenantId, {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
            ...filters,
          });
          break;

        case 'campaign_summary':
          reportData = await prisma.campaign.findMany({
            where: {
              tenantId,
              createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
              ...filters,
            },
            include: includeDetails ? {
              application: true,
              template: true,
              _count: {
                select: {
                  recipients: true,
                  emailLogs: true,
                },
              },
            } : undefined,
          });
          break;

        case 'usage_summary':
          reportData = await analyticsService.calculateTenantUsage(tenantId);
          break;

        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      return {
        type,
        period: {
          startDate,
          endDate,
        },
        filters,
        data: reportData,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Generate custom report error:', error);
      throw error;
    }
  }
}

export const reportingService = new ReportingService();
