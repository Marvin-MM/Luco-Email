
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { TEMPLATE_TYPES } from '../utils/constants.js';

class TemplateService {
  /**
   * Render template with variables
   */
  async renderTemplate(templateId, variables = {}, tenantId) {
    try {
      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          tenantId,
          isActive: true,
        },
      });

      if (!template) {
        throw new Error('Template not found or inactive');
      }

      // Validate required variables
      const missingVariables = this.validateTemplateVariables(template, variables);
      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      }

      // Render template content
      const renderedContent = this.replaceVariables(template, variables);

      return {
        ...renderedContent,
        templateId: template.id,
        templateName: template.name,
        template,
      };
    } catch (error) {
      logger.error('Template rendering error:', error);
      throw error;
    }
  }

  /**
   * Process template (alias for renderTemplate for backward compatibility)
   */
  async processTemplate(templateId, variables = {}, tenantId) {
    return await this.renderTemplate(templateId, variables, tenantId);
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(template, providedVariables) {
    if (!template.variables || !Array.isArray(template.variables)) {
      return [];
    }

    const requiredVariables = template.variables
      .filter(variable => variable.required)
      .map(variable => variable.name);

    const missingVariables = requiredVariables.filter(
      varName => !(varName in providedVariables)
    );

    return missingVariables;
  }

  /**
   * Replace variables in template content
   */
  replaceVariables(template, variables) {
    let subject = template.subject || '';
    let htmlContent = template.htmlContent || '';
    let textContent = template.textContent || '';

    // Add default variables
    const defaultVariables = {
      currentYear: new Date().getFullYear(),
      currentDate: new Date().toLocaleDateString(),
      currentDateTime: new Date().toLocaleString(),
      unsubscribeUrl: '{{unsubscribe_url}}', // Placeholder for unsubscribe functionality
    };

    const allVariables = { ...defaultVariables, ...variables };

    // Replace variables in content
    Object.entries(allVariables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const escapedValue = this.escapeHtml(String(value || ''));
      
      subject = subject.replace(placeholder, value || '');
      htmlContent = htmlContent.replace(placeholder, escapedValue);
      if (textContent) {
        textContent = textContent.replace(placeholder, value || '');
      }
    });

    return {
      subject,
      htmlContent,
      textContent,
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get template by name within application
   */
  async getTemplateByName(applicationId, templateName, tenantId) {
    try {
      return await prisma.template.findFirst({
        where: {
          applicationId,
          name: templateName,
          tenantId,
          isActive: true,
        },
      });
    } catch (error) {
      logger.error('Get template by name error:', error);
      throw error;
    }
  }

  /**
   * Extract variables from template content
   */
  extractVariablesFromContent(content) {
    const variablePattern = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    const variables = new Set();
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Validate template syntax
   */
  validateTemplateSyntax(subject, htmlContent, textContent) {
    const errors = [];

    // Extract variables from all content
    const subjectVars = this.extractVariablesFromContent(subject);
    const htmlVars = this.extractVariablesFromContent(htmlContent);
    const textVars = textContent ? this.extractVariablesFromContent(textContent) : [];

    // Check for unclosed braces
    const bracePattern = /{{[^}]*$/;
    if (bracePattern.test(subject)) {
      errors.push('Unclosed variable braces in subject');
    }
    if (bracePattern.test(htmlContent)) {
      errors.push('Unclosed variable braces in HTML content');
    }
    if (textContent && bracePattern.test(textContent)) {
      errors.push('Unclosed variable braces in text content');
    }

    return {
      isValid: errors.length === 0,
      errors,
      variables: {
        subject: subjectVars,
        html: htmlVars,
        text: textVars,
        all: Array.from(new Set([...subjectVars, ...htmlVars, ...textVars])),
      },
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId, tenantId, period = '30d') {
    try {
      // Calculate date range
      const now = new Date();
      let startDate;
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [
        totalEmails,
        deliveredEmails,
        bouncedEmails,
        complainedEmails,
      ] = await Promise.all([
        prisma.emailLog.count({
          where: {
            templateId,
            createdAt: { gte: startDate },
          },
        }),
        prisma.emailLog.count({
          where: {
            templateId,
            status: 'DELIVERED',
            createdAt: { gte: startDate },
          },
        }),
        prisma.emailLog.count({
          where: {
            templateId,
            status: 'BOUNCED',
            createdAt: { gte: startDate },
          },
        }),
        prisma.emailLog.count({
          where: {
            templateId,
            status: 'COMPLAINED',
            createdAt: { gte: startDate },
          },
        }),
      ]);

      const deliveryRate = totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0;
      const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;
      const complaintRate = totalEmails > 0 ? (complainedEmails / totalEmails) * 100 : 0;

      return {
        period,
        usage: {
          total: totalEmails,
          delivered: deliveredEmails,
          bounced: bouncedEmails,
          complained: complainedEmails,
        },
        rates: {
          delivery: parseFloat(deliveryRate.toFixed(2)),
          bounce: parseFloat(bounceRate.toFixed(2)),
          complaint: parseFloat(complaintRate.toFixed(2)),
        },
      };
    } catch (error) {
      logger.error('Template stats error:', error);
      throw error;
    }
  }

  /**
   * Validate template with provided variables
   */
  async validateTemplate(templateContent, variables = {}) {
    try {
      // Extract all variables from template
      const variableRegex = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
      const templateVariables = [];
      let match;

      while ((match = variableRegex.exec(templateContent)) !== null) {
        if (!templateVariables.includes(match[1])) {
          templateVariables.push(match[1]);
        }
      }

      // Check for missing variables
      const missingVariables = templateVariables.filter(
        variable => !(variable in variables)
      );

      // Check for unused variables
      const unusedVariables = Object.keys(variables).filter(
        variable => !templateVariables.includes(variable)
      );

      return {
        isValid: missingVariables.length === 0,
        templateVariables,
        missingVariables,
        unusedVariables,
      };
    } catch (error) {
      logger.error('Template validation failed:', error);
      throw error;
    }
  }

  /**
   * Create compliance-friendly template with unsubscribe link
   */
  createComplianceTemplate(htmlContent, textContent) {
    const unsubscribeHtml = `
      <div style="margin-top: 20px; padding: 10px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
        <p>You received this email because you subscribed to our mailing list.</p>
        <p><a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a> | <a href="{{manage_preferences_url}}" style="color: #666;">Manage Preferences</a></p>
      </div>
    `;

    const unsubscribeText = `
---
You received this email because you subscribed to our mailing list.
Unsubscribe: {{unsubscribe_url}}
Manage Preferences: {{manage_preferences_url}}
    `;

    return {
      htmlContent: htmlContent + unsubscribeHtml,
      textContent: textContent + unsubscribeText,
    };
  }
}

export const templateService = new TemplateService();
