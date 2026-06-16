import Redis from 'ioredis';
import { logger } from '../app';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6381', 10);

export const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  logger.info(`Connected to Redis on ${REDIS_HOST}:${REDIS_PORT}`);
});

redisConnection.on('error', (err) => {
  logger.error(err, 'Redis connection error');
});
