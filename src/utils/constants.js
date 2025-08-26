
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    monthlyEmailLimit: 1000,
    customTemplateLimit: 3,
    price: 0,
    features: [
      'Up to 1,000 emails/month',
      '3 custom templates',
      'Basic analytics',
      'Email support'
    ]
  },
  STARTER: {
    name: 'Starter',
    monthlyEmailLimit: 10000,
    customTemplateLimit: 10,
    price: 29,
    features: [
      'Up to 10,000 emails/month',
      '10 custom templates',
      'Advanced analytics',
      'Priority email support',
      'Custom domains'
    ]
  },
  PROFESSIONAL: {
    name: 'Professional',
    monthlyEmailLimit: 50000,
    customTemplateLimit: 50,
    price: 99,
    features: [
      'Up to 50,000 emails/month',
      '50 custom templates',
      'Real-time analytics',
      'Phone & email support',
      'Custom domains',
      'API access',
      'Team collaboration'
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyEmailLimit: 250000,
    customTemplateLimit: 200,
    price: 299,
    features: [
      'Up to 250,000 emails/month',
      'Unlimited custom templates',
      'Advanced analytics & reporting',
      'Dedicated support',
      'Custom domains',
      'Full API access',
      'Team collaboration',
      'Custom integrations',
      'SLA guarantee'
    ]
  }
};

export const EMAIL_STATUSES = {
  PENDING: 'PENDING',
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
  FAILED: 'FAILED'
};

export const CAMPAIGN_STATUSES = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export const IDENTITY_STATUSES = {
  PENDING: 'PENDING',
  VERIFYING: 'VERIFYING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED'
};

export const TEMPLATE_TYPES = {
  SYSTEM: 'SYSTEM',
  CUSTOM: 'CUSTOM'
};

export const RATE_LIMITS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10
  },
  OTP: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3
  },
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000
  },
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  EMAIL: {
    FREE: 10,
    STANDARD: 50,
    ESSENTIAL: 100,
    PREMIUM: 500,
    DEFAULT: 10
  }
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/.+/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INSUFFICIENT_CREDITS: 'Insufficient email credits',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_NOT_VERIFIED: 'Account not verified',
  TENANT_SUSPENDED: 'Tenant account suspended'
};
