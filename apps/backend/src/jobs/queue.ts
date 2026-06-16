import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const blastQueue = new Queue('whatsappBlast', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  }
});
