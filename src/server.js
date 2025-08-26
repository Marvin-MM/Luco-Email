import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import dotenv from 'dotenv';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimitConfig } from './middleware/rateLimiter.js';
import passport from './config/passport.js';
import { validateEnvVars } from './config/environment.js';
import { queueService } from './services/queueService.js';
import { performanceMonitoring, requestSizeMonitoring } from './middleware/monitoring.js';

// Import route modules
import authRoutes from './routes/authRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import identityRoutes from './routes/identityRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js'; // This is the correct admin route import
import campaignRoutes from './routes/campaignRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import systemRoutes from './routes/systemRoutes.js'; // Import system routes
import healthRoutes from './routes/healthRoutes.js'; // Import health routes
import apiKeyRoutes from './routes/apiKeyRoutes.js'; // Import API key routes
import sdkRoutes from './routes/sdkRoutes.js'; // Import SDK routes
import reportingRoutes from './routes/reportingRoutes.js';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnvVars();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Redis client for session store
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

await redisClient.connect();
logger.info('Connected to Redis');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
app.use(rateLimitConfig);

// Monitoring middleware
app.use(performanceMonitoring);
app.use(requestSizeMonitoring);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'luco.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    tenantId: req.user?.tenantId
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/health', healthRoutes); // Register health check routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/identities', identityRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes); // This is the correct admin route
app.use('/api/campaigns', campaignRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/system', systemRoutes); // Add system routes
app.use('/api/keys', apiKeyRoutes); // Add API key routes
app.use('/api/v1', sdkRoutes); // Add SDK routes
app.use('/api/reports', reportingRoutes);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Cleanup queue service
      await queueService.cleanup();
      logger.info('Queue service cleaned up');

      await redisClient.quit();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize queue service and start server
server.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Luco backend server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

  // Initialize queue service
  try {
    await queueService.initialize();
    logger.info('🔄 Queue service initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize queue service:', error);
  }
});

// Initialize scheduler
import('./utils/scheduler.js').then(({ Scheduler }) => {
  Scheduler.initialize();
});

export default app;