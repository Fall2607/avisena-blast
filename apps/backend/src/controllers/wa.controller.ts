import { Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { prisma } from '../server';
import { initSession, getSession, deleteSession, sessionQRs } from '../wa/baileys';
import { logger } from '../app';

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionName, phoneNumber } = req.body;
    
    if (!sessionName) {
      res.status(400).json({ error: 'Session name is required' });
      return;
    }

    let session = await prisma.whatsappSession.findUnique({ where: { sessionName } });

    if (!session) {
      session = await prisma.whatsappSession.create({
        data: { sessionName, status: 'CONNECTING', phoneNumber }
      });
    }

    await initSession(sessionName, phoneNumber);

    res.status(200).json({ message: 'Session initialization started', sessionName });
  } catch (error) {
    logger.error(error, 'Error creating session');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionName } = req.params;
    const sock = getSession(sessionName);

    if (!sock) {
      res.status(404).json({ error: 'Session not found or not initialized' });
      return;
    }

    // Since QR is emitted once and we need to wait for it, 
    // a better approach in Baileys is to hook into connection.update
    // Here we'll manually trigger a wait for the next QR if it's not connected.
    // However, Baileys doesn't store the latest QR natively. We'll listen for it.
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Emit cached QR if available
    const cachedQr = sessionQRs.get(sessionName);
    if (cachedQr) {
      if (cachedQr.startsWith('PAIRING_CODE:')) {
        res.write(`data: ${JSON.stringify({ qr: cachedQr })}\n\n`);
      } else {
        const qrBase64 = await QRCode.toDataURL(cachedQr);
        res.write(`data: ${JSON.stringify({ qr: qrBase64 })}\n\n`);
      }
    }

    const listener = async (update: any) => {
      const { qr, connection } = update;
      if (qr) {
        if (qr.startsWith('PAIRING_CODE:')) {
          res.write(`data: ${JSON.stringify({ qr })}\n\n`);
        } else {
          const qrBase64 = await QRCode.toDataURL(qr);
          res.write(`data: ${JSON.stringify({ qr: qrBase64 })}\n\n`);
        }
      }
      if (connection === 'open') {
        res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
        cleanup();
      }
      if (connection === 'close') {
        res.write(`data: ${JSON.stringify({ error: 'Connection closed' })}\n\n`);
        cleanup();
      }
    };

    sock.ev.on('connection.update', listener);

    const cleanup = () => {
      sock.ev.off('connection.update', listener);
      res.end();
    };

    req.on('close', cleanup);

  } catch (error) {
    logger.error(error, 'Error getting QR');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionName } = req.params;
    const session = await prisma.whatsappSession.findUnique({ where: { sessionName } });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.status(200).json({
      sessionName: session.sessionName,
      status: session.status,
      phoneNumber: session.phoneNumber
    });
  } catch (error) {
    logger.error(error, 'Error getting session status');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.whatsappSession.findMany();
    res.status(200).json(sessions);
  } catch (error) {
    logger.error(error, 'Error listing sessions');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const disconnectSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionName } = req.params;
    await deleteSession(sessionName);
    res.status(200).json({ message: 'Session disconnected and deleted successfully' });
  } catch (error) {
    logger.error(error, 'Error disconnecting session');
    res.status(500).json({ error: 'Internal server error' });
  }
};
