import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { prisma } from '../server';
import { logger } from '../app';
import pino from 'pino';

const SESSIONS_DIR = path.join(__dirname, '../../sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

export const sessions = new Map<string, WASocket>();
export const sessionQRs = new Map<string, string>();

export const initSession = async (sessionId: string, phoneNumber?: string) => {
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  logger.info(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }) as any, // Baileys logger can be very verbose
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false
  });

  sessions.set(sessionId, sock);

  sock.ev.on('creds.update', saveCreds);

  if (phoneNumber && !sock.authState.creds.registered) {
    // Wait for connection to be ready to request pairing code
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        // Format the code as XXXX-XXXX if it isn't already
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        logger.info(`Pairing code received for session ${sessionId}: ${code}`);
        const pairingQr = `PAIRING_CODE:${code}`;
        sessionQRs.set(sessionId, pairingQr);
        
        // Trigger the SSE stream by faking a QR event
        sock.ev.emit('connection.update', { qr: pairingQr });
      } catch (err) {
        logger.error(err, `Failed to request pairing code for session ${sessionId}`);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info(`QR Code received for session: ${sessionId}`);
      sessionQRs.set(sessionId, qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.info(`connection closed for session ${sessionId} due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        initSession(sessionId);
      } else {
        logger.info(`Session ${sessionId} logged out. Deleting from memory and DB.`);
        sessions.delete(sessionId);
        sessionQRs.delete(sessionId);
        await prisma.whatsappSession.update({
          where: { sessionName: sessionId },
          data: { status: 'DISCONNECTED' }
        });
        
        // Remove auth folder
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
    } else if (connection === 'open') {
      logger.info(`Opened connection for session: ${sessionId}`);
      
      const userJid = sock.user?.id;
      const phoneNumber = userJid ? userJid.split(':')[0] : null;

      await prisma.whatsappSession.update({
        where: { sessionName: sessionId },
        data: { 
          status: 'CONNECTED',
          phoneNumber: phoneNumber 
        }
      });
    }
  });

  return sock;
};

export const getSession = (sessionId: string): WASocket | undefined => {
  return sessions.get(sessionId);
};

export const deleteSession = async (sessionId: string) => {
  const sock = sessions.get(sessionId);
  if (sock) {
    try {
      await sock.logout();
    } catch (err) {
      logger.error(err, `Error logging out session ${sessionId}`);
    }
    sessions.delete(sessionId);
    sessionQRs.delete(sessionId);
  }

  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  await prisma.whatsappSession.update({
    where: { sessionName: sessionId },
    data: { status: 'DISCONNECTED', phoneNumber: null }
  });
};
