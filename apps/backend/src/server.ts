import 'dotenv/config';
import app, { logger } from './app';
import { PrismaClient } from '@prisma/client';
import { initSession } from './wa/baileys';

const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

// Initialize worker
import './jobs/worker';

const startServer = async () => {
  try {
    // Check DB connection
    await prisma.$connect();
    logger.info('Connected to Database (PostgreSQL)');

    // Restore active WhatsApp Sessions
    const activeSessions = await prisma.whatsappSession.findMany({
      where: { status: 'CONNECTED' }
    });

    if (activeSessions.length > 0) {
      logger.info(`Restoring ${activeSessions.length} active WhatsApp session(s)...`);
      for (const session of activeSessions) {
        initSession(session.sessionName).catch(err => {
          logger.error(`Failed to restore session ${session.sessionName}:`, err);
        });
      }
    }

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});
