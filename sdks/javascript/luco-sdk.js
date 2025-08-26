
/**
 * Luco JavaScript SDK
 * Official SDK for integrating with the Luco email sending platform
 * 
 * @version 1.0.0
 * @author Luco Team
 */

class LucoClient {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.luco.email';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Make HTTP request with retry logic
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/v1${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Luco-JS-SDK/1.0.0',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let lastError;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          const error = new Error(data.message || `HTTP ${response.status}`);
          error.status = response.status;
          error.code = data.error?.code;
          error.type = data.error?.type;
          error.details = data.error?.details;
          throw error;
        }

        return data;
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 429
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.retries) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
        );
      }
    }

    throw lastError;
  }

  /**
   * Get API information and rate limits
   */
  async getInfo() {
    return this._request('/info');
  }

  /**
   * Send a single email
   */
  async sendEmail(emailData) {
    const { to, subject, content, template, replyTo, attachments } = emailData;
    
    if (!to || !subject) {
      throw new Error('Recipient email and subject are required');
    }

    if (!content && !template) {
      throw new Error('Either content or template must be provided');
    }

    const payload = {
      to,
      subject,
      content,
      template,
      replyTo,
      attachments
    };

    return this._request('/email/send', {
      method: 'POST',
      body: payload
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(bulkData) {
    const { recipients, subject, content, template, replyTo, attachments } = bulkData;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients array is required and cannot be empty');
    }

    if (!subject) {
      throw new Error('Subject is required');
    }

    if (!content && !template) {
      throw new Error('Either content or template must be provided');
    }

    const payload = {
      recipients,
      subject,
      content,
      template,
      replyTo,
      attachments
    };

    return this._request('/email/send-bulk', {
      method: 'POST',
      body: payload
    });
  }

  /**
   * Get templates
   */
  async getTemplates(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.search) params.append('search', options.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this._request(`/templates${query}`);
  }

  /**
   * Get verified identities
   */
  async getIdentities(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this._request(`/identities${query}`);
  }

  /**
   * Get analytics data
   */
  async getAnalytics(options = {}) {
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this._request(`/analytics${query}`);
  }
}

// Browser and Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LucoClient };
} else if (typeof window !== 'undefined') {
  window.LucoClient = LucoClient;
}
