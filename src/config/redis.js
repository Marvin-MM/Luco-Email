
import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: config.redis.url,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected gracefully');
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: 'connected',
        latency: `${latency}ms`,
        memory: await this.client.memory('usage'),
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}

export const redisManager = new RedisManager();
