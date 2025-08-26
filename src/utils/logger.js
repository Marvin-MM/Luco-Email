
import winston from 'winston';
import { config } from '../config/environment.js';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Custom format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

// Production format
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.nodeEnv === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'luco-backend' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Add request ID to logs in production
if (config.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/access.log',
    level: 'info'
  }));
}
