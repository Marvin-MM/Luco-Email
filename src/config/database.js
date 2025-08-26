
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

let prisma;

try {
  prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

  // Log database queries in development
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
      logger.debug('Prisma Query:', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });
  }

  // Log database errors
  prisma.$on('error', (e) => {
    logger.error('Prisma Error:', e);
  });

} catch (error) {
  logger.error('Failed to initialize Prisma client:', error);
  process.exit(1);
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down Prisma client...');
  await prisma.$disconnect();
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { prisma };
