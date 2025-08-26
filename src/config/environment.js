import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'STRIPE_SECRET_KEY',
  'ENCRYPTION_KEY',
  'SMTP_USER',
  'SMTP_PASS'
];

export const validateEnvVars = () => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate specific formats
  if (process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }
  
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  logger.info('Environment variables validated successfully');
};

export const config = {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  
  database: {
    url: process.env.DATABASE_URL
  },
  
  redis: {
    url: process.env.REDIS_URL
  },
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  session: {
    secret: process.env.SESSION_SECRET
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback'
  },
  
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sesIdentityNamePrefix: process.env.AWS_SES_IDENTITY_NAME_PREFIX || 'luco-tenant'
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY
  },
  
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES) || 15,
    length: parseInt(process.env.OTP_LENGTH) || 6
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 5,
    path: process.env.UPLOAD_PATH || './uploads'
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL,
    superAdminSecret: process.env.SUPER_ADMIN_SECRET
  },
  
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true'
  },
  
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
    emailBatchSize: parseInt(process.env.EMAIL_BATCH_SIZE) || 100,
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3,
    retryDelayMs: parseInt(process.env.QUEUE_RETRY_DELAY_MS) || 5000,
    redisUrl: process.env.BULL_REDIS_URL || process.env.REDIS_URL,
    redisDb: parseInt(process.env.BULL_REDIS_DB) || 1
  },
  
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 3600,
    templateTtl: parseInt(process.env.TEMPLATE_CACHE_TTL) || 1800
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },
  
  email: {
    defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@yourdomain.com',
    defaultFromName: process.env.DEFAULT_FROM_NAME || 'Luco Platform',
    verificationUrlBase: process.env.EMAIL_VERIFICATION_URL_BASE || 'http://localhost:3000/verify-email',
    passwordResetUrlBase: process.env.PASSWORD_RESET_URL_BASE || 'http://localhost:3000/reset-password'
  },
  
  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365,
    batchSize: parseInt(process.env.BATCH_ANALYTICS_SIZE) || 1000
  },
  
  subscriptionPlans: {
    free: {
      emailLimit: parseInt(process.env.FREE_PLAN_EMAIL_LIMIT) || 1000,
      templateLimit: parseInt(process.env.FREE_PLAN_TEMPLATE_LIMIT) || 3
    },
    starter: {
      emailLimit: parseInt(process.env.STARTER_PLAN_EMAIL_LIMIT) || 10000,
      templateLimit: parseInt(process.env.STARTER_PLAN_TEMPLATE_LIMIT) || 10
    },
    pro: {
      emailLimit: parseInt(process.env.PRO_PLAN_EMAIL_LIMIT) || 100000,
      templateLimit: parseInt(process.env.PRO_PLAN_TEMPLATE_LIMIT) || 50
    },
    enterprise: {
      emailLimit: parseInt(process.env.ENTERPRISE_PLAN_EMAIL_LIMIT) || 1000000,
      templateLimit: parseInt(process.env.ENTERPRISE_PLAN_TEMPLATE_LIMIT) || 200
    }
  },
  
  features: {
    enableAnalyticsDashboard: process.env.ENABLE_ANALYTICS_DASHBOARD === 'true',
    enableTemplateEditor: process.env.ENABLE_TEMPLATE_EDITOR === 'true',
    enableCampaignScheduling: process.env.ENABLE_CAMPAIGN_SCHEDULING === 'true',
    enableABTesting: process.env.ENABLE_A_B_TESTING === 'true'
  },
  
  healthCheck: {
    intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 30000,
    databaseTimeoutMs: parseInt(process.env.DATABASE_HEALTH_TIMEOUT_MS) || 5000,
    redisTimeoutMs: parseInt(process.env.REDIS_HEALTH_TIMEOUT_MS) || 3000
  }
};
