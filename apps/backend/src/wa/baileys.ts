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
  navPath: string[]; // Navigation breadcrumb stack: ['opt_1', 'sub_2', ...]
  atLeaf?: boolean;  // True if user is currently viewing a leaf reply message
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

// Recursive N-Level Navigation Location Resolver
interface NavLocation {
  currentNode: any | null; // null if at Root Menu Utama
  currentOptions: any[];   // items to display / choose from at current level
  parentPath: string[];    // breadcrumb path up to current level
  level: number;           // 0 = Root, 1 = Sub-Menu, 2 = Sub-Sub-Menu...
}

const resolveNavLocation = (rootItems: any[], navPath: string[]): NavLocation => {
  let currentOptions = Array.isArray(rootItems) ? rootItems : [];
  let currentNode: any = null;
  const parentPath: string[] = [];

  for (let p = 0; p < navPath.length; p++) {
    const targetId = navPath[p];
    const found = currentOptions.find((opt: any, idx: number) => 
      opt.id === targetId || 
      `opt_${idx + 1}` === targetId || 
      `sub_${idx + 1}` === targetId ||
      opt.value === targetId
    );

    if (!found) {
      break;
    }

    currentNode = found;
    parentPath.push(targetId);
    currentOptions = (found.hasSubMenu && Array.isArray(found.subOptions)) ? found.subOptions : [];
  }

  return {
    currentNode,
    currentOptions,
    parentPath,
    level: parentPath.length
  };
};

const sendInteractiveOrTextMessage = async (
  sock: WASocket,
  sessionId: string,
  remoteJid: string,
  text: string,
  title: string,
  options: any[],
  isSubMenu: boolean = false,
  _menuType: string = 'TEXT_NUMBER',
  _listButtonText: string = '',
  _sectionTitle: string = ''
) => {
  // Format list items or sub-options into a clean, luxury numbered WhatsApp text menu
  // 100% reliable across Android, iPhone, WhatsApp Web, and Desktop
  let finalText = text;

  if (Array.isArray(options) && options.length > 0) {
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
        ? `0️⃣ *Kembali ke Menu Sebelumnya*\n\n👉 *Balas dengan angka (1-${options.length}) atau ketik 0 untuk kembali ke menu sebelumnya.*`
        : `👉 *Balas dengan angka (1-${options.length}) untuk memilih menu.*`;

      finalText = `${text}\n\n${formattedItems}\n\n${backGuide}`;
    }
  } else {
    // Single reply leaf message
    if (!finalText.includes('0') && !finalText.toLowerCase().includes('menu')) {
      finalText = `${text}\n\n👉 *Ketik 0 untuk kembali ke menu sebelumnya, atau ketik MENU untuk ke Menu Utama.*`;
    }
  }

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
        const textLower = effectiveText.toLowerCase().trim();
        const isBackOneLevel = effectiveText.trim() === '0' || textLower === 'kembali' || textLower === 'back';
        const isJumpToRoot = textLower === 'menu' || textLower === 'utama' || textLower === 'awal';

        // Clean up expired conversation state (older than 30 mins)
        const currentSession = userBotSessions.get(sessionKey);
        if (currentSession && (Date.now() - currentSession.lastActive > 30 * 60 * 1000)) {
          userBotSessions.delete(sessionKey);
        }
        const activeUserSession = userBotSessions.get(sessionKey);

        // 5. Case: Jump straight to Root Menu Utama ('MENU', 'UTAMA')
        if (isJumpToRoot) {
          logger.info(`[Bot ${sessionId}] Jump to Root Menu requested by ${remoteJid}`);
          const mainRule = (activeUserSession?.ruleId && rules.find(r => r.id === activeUserSession.ruleId)) ||
            rules.find(r => r.keywords.toLowerCase().includes('menu') || r.keywords.toLowerCase().includes('halo')) ||
            rules[0];

          if (mainRule) {
            userBotSessions.set(sessionKey, { ruleId: mainRule.id, navPath: [], atLeaf: false, lastActive: Date.now() });
            const { items } = parseBotButtons(mainRule.buttons);
            await sendInteractiveOrTextMessage(
              sock,
              sessionId,
              remoteJid,
              mainRule.response,
              mainRule.name,
              items,
              false
            );
            continue;
          }
        }

        // 6. Case: User sends '0' (Kembali ke menu sebelumnya)
        if (isBackOneLevel) {
          if (activeUserSession) {
            const targetRule = rules.find(r => r.id === activeUserSession.ruleId) || rules[0];
            const { items: rootItems } = parseBotButtons(targetRule.buttons);

            if (activeUserSession.atLeaf) {
              // User was looking at a leaf direct reply -> return to the menu where they made that choice!
              activeUserSession.atLeaf = false;
              activeUserSession.lastActive = Date.now();

              if (!activeUserSession.navPath || activeUserSession.navPath.length === 0) {
                // Return to Root Menu Utama
                logger.info(`[Bot ${sessionId}] Back from leaf to Root Menu Utama for ${remoteJid}`);
                await sendInteractiveOrTextMessage(
                  sock,
                  sessionId,
                  remoteJid,
                  targetRule.response,
                  targetRule.name,
                  rootItems,
                  false
                );
              } else {
                // Return to current sub-menu
                const { currentNode, currentOptions, level } = resolveNavLocation(rootItems, activeUserSession.navPath);
                logger.info(`[Bot ${sessionId}] Back from leaf to Level ${level} Menu "${currentNode?.label}" for ${remoteJid}`);
                const subPrompt = currentNode?.replyMessage?.trim() || `Silakan pilih informasi untuk *${currentNode?.label}*:`;
                await sendInteractiveOrTextMessage(
                  sock,
                  sessionId,
                  remoteJid,
                  subPrompt,
                  currentNode?.label || 'Menu Layanan',
                  currentOptions,
                  true
                );
              }
              continue;
            } else if (activeUserSession.navPath && activeUserSession.navPath.length > 0) {
              // User was at a sub-menu -> pop one level to parent menu
              activeUserSession.navPath.pop();
              activeUserSession.atLeaf = false;
              activeUserSession.lastActive = Date.now();

              if (activeUserSession.navPath.length === 0) {
                // Back at Root Menu Utama!
                logger.info(`[Bot ${sessionId}] Back to Root Menu Utama for ${remoteJid}`);
                await sendInteractiveOrTextMessage(
                  sock,
                  sessionId,
                  remoteJid,
                  targetRule.response,
                  targetRule.name,
                  rootItems,
                  false
                );
              } else {
                // Back at intermediate parent menu
                const { currentNode, currentOptions, level } = resolveNavLocation(rootItems, activeUserSession.navPath);
                logger.info(`[Bot ${sessionId}] Back to Level ${level} Menu "${currentNode?.label}" for ${remoteJid}`);
                const subPrompt = currentNode?.replyMessage?.trim() || `Silakan pilih informasi untuk *${currentNode?.label}*:`;
                await sendInteractiveOrTextMessage(
                  sock,
                  sessionId,
                  remoteJid,
                  subPrompt,
                  currentNode?.label || 'Menu Layanan',
                  currentOptions,
                  true
                );
              }
              continue;
            } else {
              // Already at Root Menu Utama: re-send Root Menu
              userBotSessions.set(sessionKey, { ruleId: targetRule.id, navPath: [], atLeaf: false, lastActive: Date.now() });
              await sendInteractiveOrTextMessage(
                sock,
                sessionId,
                remoteJid,
                targetRule.response,
                targetRule.name,
                rootItems,
                false
              );
              continue;
            }
          }
        }

        // 7. Case: User is in an active rule session -> pick from active options at current navPath!
        let handledInActiveSession = false;

        if (activeUserSession?.ruleId) {
          const currentRule = rules.find(r => r.id === activeUserSession.ruleId);
          if (currentRule && currentRule.buttons) {
            try {
              const { items: rootItems } = parseBotButtons(currentRule.buttons);
              const { currentNode, currentOptions, level } = resolveNavLocation(rootItems, activeUserSession.navPath || []);

              if (Array.isArray(currentOptions) && currentOptions.length > 0) {
                // Find matching option at this level
                let matchedOpt: any = null;
                let matchedIdx = -1;

                if (!isNaN(numInput) && numInput >= 1 && numInput <= currentOptions.length) {
                  matchedIdx = numInput - 1;
                  matchedOpt = currentOptions[matchedIdx];
                } else {
                  for (let i = 0; i < currentOptions.length; i++) {
                    const opt = currentOptions[i];
                    const idMatches = clickedButtonId && (
                      opt.id === clickedButtonId || 
                      opt.value === clickedButtonId ||
                      `opt_${i + 1}` === clickedButtonId ||
                      `sub_${i + 1}` === clickedButtonId
                    );
                    const labelMatches = (clickedButtonLabel || incomingText) && opt.label && (
                      opt.label.toLowerCase().trim() === (clickedButtonLabel || incomingText).toLowerCase().trim() ||
                      opt.label.toLowerCase().includes(effectiveText.toLowerCase()) ||
                      effectiveText.toLowerCase().includes(opt.label.toLowerCase())
                    );
                    if (idMatches || labelMatches) {
                      matchedOpt = opt;
                      matchedIdx = i;
                      break;
                    }
                  }
                }

                if (matchedOpt) {
                  // Check if this option has nested sub-options (deeper level!)
                  if (matchedOpt.hasSubMenu && Array.isArray(matchedOpt.subOptions) && matchedOpt.subOptions.length > 0) {
                    const optKey = matchedOpt.id || `opt_${matchedIdx + 1}`;
                    activeUserSession.navPath = [...(activeUserSession.navPath || []), optKey];
                    activeUserSession.atLeaf = false;
                    activeUserSession.lastActive = Date.now();

                    logger.info(`[Bot ${sessionId}] Option "${matchedOpt.label}" selected -> entering Level ${activeUserSession.navPath.length} Sub-Menu`);
                    const subPrompt = matchedOpt.replyMessage?.trim() || `Silakan pilih informasi untuk *${matchedOpt.label}*:`;
                    await sendInteractiveOrTextMessage(
                      sock,
                      sessionId,
                      remoteJid,
                      subPrompt,
                      matchedOpt.label,
                      matchedOpt.subOptions,
                      true // isSubMenu: true
                    );
                    handledInActiveSession = true;
                  } else if (matchedOpt.replyMessage && matchedOpt.replyMessage.trim()) {
                    // Leaf direct reply response
                    logger.info(`[Bot ${sessionId}] Option "${matchedOpt.label}" selected (idx: ${matchedIdx + 1}) -> sending direct reply response`);
                    activeUserSession.atLeaf = true;
                    activeUserSession.lastActive = Date.now();
                    await sendInteractiveOrTextMessage(
                      sock,
                      sessionId,
                      remoteJid,
                      matchedOpt.replyMessage.trim(),
                      matchedOpt.label || 'Informasi Layanan',
                      []
                    );
                    handledInActiveSession = true;
                  }
                }
              }
            } catch (err) {
              logger.warn(`[Bot ${sessionId}] Error processing active session for ${remoteJid}: ${err}`);
            }
          }
        }

        if (handledInActiveSession) continue;

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
            navPath: [], 
            atLeaf: false,
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
