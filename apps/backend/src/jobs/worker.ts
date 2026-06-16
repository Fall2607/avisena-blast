import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { getSession } from '../wa/baileys';
import { prisma } from '../server';
import { logger } from '../app';

export interface BlastJobData {
  sessionId: string;
  recipientId: string; // CampaignRecipient ID
  phone: string;
  message: string;
  minDelaySec: number;
  maxDelaySec: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const blastWorker = new Worker<BlastJobData>(
  'whatsappBlast',
  async (job: Job<BlastJobData>) => {
    const { sessionId, recipientId, phone, message, minDelaySec, maxDelaySec } = job.data;

    try {
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'PROCESSING' }
      });

      // Random delay between minDelaySec and maxDelaySec
      const delayMs = Math.floor(Math.random() * (maxDelaySec - minDelaySec + 1) + minDelaySec) * 1000;
      logger.info(`Job ${job.id}: Delaying for ${delayMs}ms before sending to ${phone}`);
      await sleep(delayMs);

      const sock = getSession(sessionId);
      if (!sock) {
        throw new Error(`Session ${sessionId} is not available`);
      }

      // Format phone number
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      }
      if (!formattedPhone.endsWith('@s.whatsapp.net')) {
        formattedPhone = formattedPhone + '@s.whatsapp.net';
      }

      // Send message
      await sock.sendMessage(formattedPhone, { text: message });

      // Update DB Success
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'SENT', sentAt: new Date() }
      });

      // Log success
      const sessionData = await prisma.whatsappSession.findUnique({ where: { sessionName: sessionId } });
      if (sessionData) {
        await prisma.messageLog.create({
          data: {
            sessionId: sessionData.id,
            phone: formattedPhone,
            message,
            status: 'SENT'
          }
        });
      }

      logger.info(`Job ${job.id}: Successfully sent message to ${phone}`);

    } catch (error: any) {
      logger.error(error, `Job ${job.id}: Failed to send message to ${phone}`);

      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'FAILED', errorMessage: error.message }
      });

      // Re-throw so BullMQ can retry
      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 1, // To respect rate limits and delays, process one by one per worker
  }
);

blastWorker.on('failed', (job, err) => {
  if (job) {
    logger.warn(`Job ${job.id} failed with error ${err.message}`);
  }
});
