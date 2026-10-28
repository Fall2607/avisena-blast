import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  Browsers,
  proto,
  generateWAMessageFromContent
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

// In-memory conversation state for multi-turn nested bot menus
interface UserBotSession {
  ruleId: string;
  activeOptionId: string | null; // e.g. 'opt_1' when viewing sub-menu of option 1
  lastActive: number;
}

const userBotSessions = new Map<string, UserBotSession>();

interface ParsedBotButtons {
  menuType: 'TEXT_NUMBER' | 'WA_LIST';
  listButtonText: string;
  sectionTitle: string;
  items: any[];
}

const parseBotButtons = (rawButtons: string | any | null | undefined): ParsedBotButtons => {
  if (!rawButtons) {
    return { menuType: 'TEXT_NUMBER', listButtonText: 'Silahkan Pilih :', sectionTitle: 'Pilihan Layanan', items: [] };
  }

  let parsed: any = null;
  try {
    parsed = typeof rawButtons === 'string' ? JSON.parse(rawButtons) : rawButtons;
  } catch {
    return { menuType: 'TEXT_NUMBER', listButtonText: 'Silahkan Pilih :', sectionTitle: 'Pilihan Layanan', items: [] };
  }

  if (Array.isArray(parsed)) {
    return {
      menuType: 'TEXT_NUMBER',
      listButtonText: 'Silahkan Pilih :',
      sectionTitle: 'Pilihan Layanan',
      items: parsed
    };
  }

  if (parsed && typeof parsed === 'object') {
    return {
      menuType: parsed.menuType === 'WA_LIST' ? 'WA_LIST' : 'TEXT_NUMBER',
      listButtonText: parsed.listButtonText || 'Silahkan Pilih :',
      sectionTitle: parsed.sectionTitle || 'Pilihan Layanan',
      items: Array.isArray(parsed.items) ? parsed.items : []
    };
  }

  return { menuType: 'TEXT_NUMBER', listButtonText: 'Silahkan Pilih :', sectionTitle: 'Pilihan Layanan', items: [] };
};

// Handle incoming messages for WhatsApp Bot Auto-Reply
const sendInteractiveOrTextMessage = async (
  sock: WASocket,
  sessionId: string,
  remoteJid: string,
  text: string,
  title: string,
  options: any[],
  isSubMenu: boolean = false,
  menuType: 'TEXT_NUMBER' | 'WA_LIST' = 'TEXT_NUMBER',
  listButtonText: string = 'Silahkan Pilih :',
  sectionTitle: string = 'Pilihan Layanan'
) => {
  // 1. If WA_LIST is selected and options exist: try sending native WhatsApp single_select interactive message (Hermina Style)
  if (menuType === 'WA_LIST' && Array.isArray(options) && options.length > 0) {
    try {
      const rows = options.map((btn, idx) => ({
        id: btn.id || `opt_${idx + 1}`,
        title: (btn.label || `Pilihan ${idx + 1}`).replace(/^\d+[\.\s\-]+/, '').trim().slice(0, 24),
        description: (btn.description || '').trim().slice(0, 72)
      }));

      const singleSelectButton = {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: (listButtonText || 'Silahkan Pilih :').trim(),
          sections: [
            {
              title: (sectionTitle || 'Pilihan Menu Layanan').trim(),
              rows
            }
          ]
        })
      };

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: text.trim() }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Avisena Healthcare Group' }),
        header: proto.Message.InteractiveMessage.Header.create({ title: title || 'Layanan Informasi RS', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: [singleSelectButton]
        })
      });

      const content = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage
          }
        }
      };

      const userJid = sock.user?.id || remoteJid;
      const waMsg = generateWAMessageFromContent(remoteJid, content, { userJid });
      logger.info(`[Bot ${sessionId}] Sending WA_LIST interactive message to ${remoteJid}`);
      await sock.relayMessage(remoteJid, waMsg.message!, { messageId: waMsg.key.id! });
      return;
    } catch (listErr) {
      logger.warn(`[Bot ${sessionId}] Failed to send native WA_LIST interactive message, falling back to text: ${listErr}`);
    }
  }

  // 2. Format list items or sub-options into a clean, numbered WhatsApp text menu (Default / Safe Fallback)
  let finalText = text;

  if (Array.isArray(options) && options.length > 0) {
    if (options.length === 1 && (options[0].value === 'menu' || options[0].label.toLowerCase().includes('menu'))) {
      if (!finalText.toLowerCase().includes('0') && !finalText.toLowerCase().includes('menu')) {
        finalText = `${text}\n\n👉 *Ketik 0 atau MENU untuk kembali ke menu utama.*`;
      }
    } else {
      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

      // Check if message doesn't already contain numbered list
      if (!finalText.includes('1️⃣') && !finalText.includes('1.')) {
        const formattedItems = options.map((btn, idx) => {
          const num = numberEmojis[idx] || `${idx + 1}.`;
          const label = (btn.label || `Pilihan ${idx + 1}`).replace(/^\d+[\.\s\-]+/, '').trim();
          const desc = btn.description ? `\n   _${btn.description}_` : '';
          return `${num} *${label}*${desc}`;
        }).join('\n\n');

        const backGuide = isSubMenu
          ? `0️⃣ *Kembali ke Menu Utama*\n\n👉 *Balas dengan angka (1-${options.length}) atau ketik 0 untuk kembali ke menu utama.*`
          : `0️⃣ *Kembali ke Menu Utama*\n\n👉 *Balas dengan angka (1-${options.length}) atau ketik 0 untuk menu utama.*`;

        finalText = `${text}\n\n${formattedItems}\n\n${backGuide}`;
      }
    }
  } else {
    // Single reply leaf message
    if (!finalText.includes('0') && !finalText.toLowerCase().includes('menu')) {
      finalText = `${text}\n\n👉 *Ketik 0 atau MENU untuk kembali ke menu utama.*`;
    }
  }

  // Always send via standard WhatsApp message to guarantee 100% instant delivery on all WhatsApp clients (Android, iOS, Web)
  logger.info(`[Bot ${sessionId}] Sending message to ${remoteJid}`);
  await sock.sendMessage(remoteJid, { text: finalText });
};

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // 1. Ignore outgoing messages sent by the bot/user
      if (msg.key.fromMe) continue;

      // 2. Ignore broadcast status updates
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast') continue;

      // 3. Extract incoming text and clicked button details
      let incomingText = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      ).trim();

      let clickedButtonId: string | null = null;
      let clickedButtonLabel: string | null = null;

      if (msg.message?.interactiveResponseMessage) {
        const intResp = msg.message.interactiveResponseMessage;
        if (intResp.nativeFlowResponseMessage?.paramsJson) {
          try {
            const parsed = JSON.parse(intResp.nativeFlowResponseMessage.paramsJson);
            clickedButtonId = (parsed.id || '').trim();
          } catch {}
        }
        if (intResp.body?.text) {
          clickedButtonLabel = intResp.body.text.trim();
        }
      }

      if (!clickedButtonId && msg.message?.buttonsResponseMessage?.selectedButtonId) {
        clickedButtonId = msg.message.buttonsResponseMessage.selectedButtonId.trim();
        clickedButtonLabel = msg.message.buttonsResponseMessage.selectedDisplayText || null;
      } else if (!clickedButtonId && msg.message?.templateButtonReplyMessage?.selectedId) {
        clickedButtonId = msg.message.templateButtonReplyMessage.selectedId.trim();
        clickedButtonLabel = msg.message.templateButtonReplyMessage.selectedDisplayText || null;
      } else if (!clickedButtonId && msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        clickedButtonId = msg.message.listResponseMessage.singleSelectReply.selectedRowId.trim();
        clickedButtonLabel = (msg.message.listResponseMessage as any)?.title || null;
      }

      const effectiveText = (clickedButtonId || incomingText || clickedButtonLabel || '').trim();
      if (!effectiveText) continue;

      try {
        // 4. Fetch all active bot rules applicable to this session or all sessions
        const rules = await prisma.botRule.findMany({
          where: { 
            isActive: true,
            OR: [
              { sessionId: null },
              { sessionId: '' },
              { sessionId: 'ALL' },
              { sessionId: sessionId }
            ]
          },
          orderBy: { createdAt: 'asc' }
        });

        if (rules.length === 0) continue;

        // Sort: specific session rules take precedence over global rules
        rules.sort((a, b) => {
          if (a.sessionId === sessionId && b.sessionId !== sessionId) return -1;
          if (a.sessionId !== sessionId && b.sessionId === sessionId) return 1;
          return 0;
        });

        const sessionKey = `${sessionId}:${remoteJid}`;
        const numInput = parseInt(effectiveText.trim(), 10);
        const isReturnCommand = effectiveText.trim() === '0' || 
          effectiveText.toLowerCase().trim() === 'menu' || 
          effectiveText.toLowerCase().trim() === 'kembali';

        // Clean up expired conversation state (older than 30 mins)
        const currentSession = userBotSessions.get(sessionKey);
        if (currentSession && (Date.now() - currentSession.lastActive > 30 * 60 * 1000)) {
          userBotSessions.delete(sessionKey);
        }
        const activeUserSession = userBotSessions.get(sessionKey);

        // 5. Case: User sends '0' or 'MENU' -> Return to Main Menu
        if (isReturnCommand) {
          logger.info(`[Bot ${sessionId}] Return to Main Menu requested by ${remoteJid}`);
          const mainRule = (activeUserSession?.ruleId && rules.find(r => r.id === activeUserSession.ruleId)) ||
            rules.find(r => r.keywords.toLowerCase().includes('menu') || r.keywords.toLowerCase().includes('halo')) ||
            rules[0];

          if (mainRule) {
            userBotSessions.set(sessionKey, { ruleId: mainRule.id, activeOptionId: null, lastActive: Date.now() });
            const { menuType, listButtonText, sectionTitle, items } = parseBotButtons(mainRule.buttons);
            await sendInteractiveOrTextMessage(
              sock,
              sessionId,
              remoteJid,
              mainRule.response,
              mainRule.name,
              items,
              false,
              menuType,
              listButtonText,
              sectionTitle
            );
            continue;
          }
        }

        // 6. Case: User is currently inside a Sub-Menu (Nested Options)
        if (activeUserSession?.activeOptionId) {
          const parentRule = rules.find(r => r.id === activeUserSession.ruleId);
          if (parentRule && parentRule.buttons) {
            try {
              const { items: parentItems } = parseBotButtons(parentRule.buttons);
              const parentOption = Array.isArray(parentItems) && parentItems.find((b: any, idx: number) => 
                b.id === activeUserSession.activeOptionId || `opt_${idx + 1}` === activeUserSession.activeOptionId
              );

              if (parentOption && Array.isArray(parentOption.subOptions) && parentOption.subOptions.length > 0) {
                let matchedSub: any = null;

                // Match by numeric index (1 to subOptions.length)
                if (!isNaN(numInput) && numInput >= 1 && numInput <= parentOption.subOptions.length) {
                  matchedSub = parentOption.subOptions[numInput - 1];
                } else {
                  // Match by label
                  matchedSub = parentOption.subOptions.find((so: any) => 
                    so.label.toLowerCase().includes(effectiveText.toLowerCase()) ||
                    effectiveText.toLowerCase().includes(so.label.toLowerCase())
                  );
                }

                if (matchedSub && matchedSub.replyMessage) {
                  logger.info(`[Bot ${sessionId}] Sub-option "${matchedSub.label}" selected by ${remoteJid}`);
                  activeUserSession.lastActive = Date.now();
                  await sendInteractiveOrTextMessage(
                    sock,
                    sessionId,
                    remoteJid,
                    matchedSub.replyMessage.trim(),
                    matchedSub.label,
                    []
                  );
                  continue;
                }
              }
            } catch (err) {
              logger.warn(`[Bot ${sessionId}] Error processing sub-menu for ${remoteJid}: ${err}`);
            }
          }
        }

        // 7. Case: User sends a number or selects from Main Menu Options
        let handledByOption = false;

        for (const rule of rules) {
          if (!rule.buttons) continue;
          try {
            const { menuType, listButtonText, sectionTitle, items: btns } = parseBotButtons(rule.buttons);
            if (Array.isArray(btns)) {
              for (let i = 0; i < btns.length; i++) {
                const btn = btns[i];
                const indexMatch = !isNaN(numInput) && numInput === (i + 1);
                const idMatches = clickedButtonId && (
                  btn.id === clickedButtonId || 
                  `btn_${btn.id}` === clickedButtonId || 
                  btn.value === clickedButtonId ||
                  `btn_opt_${i + 1}` === clickedButtonId ||
                  `opt_${i + 1}` === clickedButtonId ||
                  `row_${i + 1}` === clickedButtonId
                );
                const labelMatches = (clickedButtonLabel || incomingText) && btn.label && (
                  btn.label.toLowerCase().trim() === (clickedButtonLabel || incomingText).toLowerCase().trim() ||
                  btn.label.toLowerCase().includes(effectiveText.toLowerCase()) ||
                  effectiveText.toLowerCase().includes(btn.label.toLowerCase())
                );

                if (indexMatch || idMatches || labelMatches) {
                  // Check if this option has nested sub-options!
                  if (Array.isArray(btn.subOptions) && btn.subOptions.length > 0) {
                    logger.info(`[Bot ${sessionId}] Option "${btn.label}" has ${btn.subOptions.length} nested sub-options -> entering sub-menu`);
                    userBotSessions.set(sessionKey, { 
                      ruleId: rule.id, 
                      activeOptionId: btn.id || `opt_${i + 1}`, 
                      lastActive: Date.now() 
                    });

                    const subMenuPrompt = btn.replyMessage?.trim() || `Silakan pilih informasi untuk *${btn.label}*:`;
                    await sendInteractiveOrTextMessage(
                      sock,
                      sessionId,
                      remoteJid,
                      subMenuPrompt,
                      btn.label,
                      btn.subOptions,
                      true, // isSubMenu
                      menuType,
                      listButtonText,
                      btn.label
                    );
                    handledByOption = true;
                    break;
                  }

                  // Standard direct reply option
                  if (btn.replyMessage && btn.replyMessage.trim()) {
                    logger.info(`[Bot ${sessionId}] Option "${btn.label}" selected (idx: ${i + 1}) -> sending direct reply response`);
                    userBotSessions.set(sessionKey, { 
                      ruleId: rule.id, 
                      activeOptionId: null, 
                      lastActive: Date.now() 
                    });

                    await sendInteractiveOrTextMessage(
                      sock,
                      sessionId,
                      remoteJid,
                      btn.replyMessage.trim(),
                      btn.label || 'Informasi Layanan',
                      []
                    );
                    handledByOption = true;
                    break;
                  }
                }
              }
            }
          } catch {}
          if (handledByOption) break;
        }

        if (handledByOption) continue;

        // 8. Otherwise match normal rules by keyword
        let matchedRule: any = null;
        let fallbackRule: any = null;
        const searchKeywords = [
          effectiveText.toLowerCase(),
          (clickedButtonLabel || '').toLowerCase(),
          incomingText.toLowerCase()
        ].filter(Boolean);

        for (const rule of rules) {
          if (rule.triggerType === 'FALLBACK') {
            if (!fallbackRule) {
              fallbackRule = rule;
            }
            continue;
          }

          const keywords = rule.keywords
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter(Boolean);

          if (rule.triggerType === 'EXACT') {
            if (searchKeywords.some((sk) => keywords.includes(sk))) {
              matchedRule = rule;
              break;
            }
          } else if (rule.triggerType === 'CONTAINS') {
            if (searchKeywords.some((sk) => keywords.some((k) => sk.includes(k) || k.includes(sk)))) {
              matchedRule = rule;
              break;
            }
          }
        }

        // 9. Use fallback if no specific keyword matched
        if (!matchedRule && fallbackRule) {
          matchedRule = fallbackRule;
        }

        // 10. Send auto-reply message for matched rule
        if (matchedRule) {
          logger.info(`[Bot ${sessionId}] Replying to ${remoteJid} for message: "${effectiveText}" with rule "${matchedRule.name}"`);
          userBotSessions.set(sessionKey, { 
            ruleId: matchedRule.id, 
            activeOptionId: null, 
            lastActive: Date.now() 
          });

          const { menuType, listButtonText, sectionTitle, items } = parseBotButtons(matchedRule.buttons);

          await sendInteractiveOrTextMessage(
            sock,
            sessionId,
            remoteJid,
            matchedRule.response,
            matchedRule.name,
            items,
            false,
            menuType,
            listButtonText,
            sectionTitle
          );
        }
      } catch (botErr) {
        logger.error(botErr, `[Bot ${sessionId}] Error processing auto-reply for ${remoteJid}`);
      }
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
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (err) {
      logger.error(err, `Failed to delete session directory for ${sessionId}`);
    }
  }

  try {
    await prisma.whatsappSession.delete({
      where: { sessionName: sessionId }
    });
  } catch (error) {
    logger.error(`Failed to delete session ${sessionId} from DB: ${error}`);
  }
};
