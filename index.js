// ╔══════════════════════════════════════════════╗
// ║        NEKOSBOT GACHA v3.1 (BAILEYS PRO)     ║
// ║   by lopezdavison7-ops                       ║
// ║   Powered by Baileys - Sin Puppeteer         ║
// ╚══════════════════════════════════════════════╝

'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  Browsers,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const readline  = require('readline');
const axios     = require('axios');
const fs        = require('fs');
const pino      = require('pino');

// ──────────────── CONFIG ────────────────
const OWNER_RAW   = (process.env.OWNER || '50578391933').replace(/\D/g, '');
const OWNER_JID   = `${OWNER_RAW}@s.whatsapp.net`;
const API_YT      = process.env.API_YT || 'lem916';
const API_TT      = process.env.API_TT || 'lem916';
const DB_PATH     = './database.json';
const HIST_DIR    = './documentos';
const HIST_PATH   = `${HIST_DIR}/historial.txt`;
const AUTH_DIR    = './auth_info';
const START_TIME  = Date.now();

// ──────────────── HEALTH SERVER (Render) ────────────────
const http = require('http');
const PORT_HTTP = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NEKOSBOT GACHA v3.1 🟢 Online\n');
}).listen(PORT_HTTP, '0.0.0.0', () => {
  console.log(`🌐 Health server activo en puerto ${PORT_HTTP}`);
});

// ──────────────── DIRECTORIOS ────────────────
if (!fs.existsSync(HIST_DIR)) fs.mkdirSync(HIST_DIR, { recursive: true });
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
if (!fs.existsSync(HIST_PATH)) fs.writeFileSync(HIST_PATH, '=== HISTORIAL NEKOSBOT GACHA ===\n');

// ──────────────── DATABASE ────────────────
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const d = { users: {}, cooldowns: {}, misiones: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2));
    return d;
  }
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { users: {}, cooldowns: {}, misiones: {} }; }
}
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function getUser(db, id) {
  if (!db.users[id]) {
    db.users[id] = {
      dinero: 500, banco: 0, nivel: 1, xp: 0,
      inventario: [], victorias: 0, derrotas: 0,
      pesca: 0, caza: 0, streak: 0,
      ultimoDiario: 0, misionActual: null, misionProgreso: 0,
      creado: Date.now()
    };
  }
  return db.users[id];
}
function addXP(db, id, amount) {
  const u = getUser(db, id);
  u.xp += amount;
  const needed = u.nivel * 120;
  if (u.xp >= needed) { u.xp -= needed; u.nivel++; return true; }
  return false;
}
function logHistory(txt) {
  fs.appendFileSync(HIST_PATH, `[${new Date().toLocaleString('es-NI')}] ${txt}\n`);
}

// ──────────────── COOLDOWNS ────────────────
const CD = {};
function cooldown(uid, cmd, secs) {
  const key = `${uid}:${cmd}`, now = Date.now();
  if (CD[key] && now - CD[key] < secs * 1000)
    return Math.ceil((secs * 1000 - (now - CD[key])) / 1000);
  CD[key] = now; return 0;
}

// ──────────────── GACHA + UTILS (todo tu código original) ────────────────
const GACHA_POOL = [
  { nombre: '⚔️ Espada Común',   rareza: 'Común',      prob: 40, bonus: 50 },
  { nombre: '🏹 Arco Común',     rareza: 'Común',      prob: 30, bonus: 60 },
  { nombre: '🌟 Orbe Raro',      rareza: 'Raro',       prob: 15, bonus: 200 },
  { nombre: '💎 Gema Épica',     rareza: 'Épico',      prob: 10, bonus: 500 },
  { nombre: '👑 Corona SSR',     rareza: 'Legendaria', prob: 4,  bonus: 1500 },
  { nombre: '🎆 ULTRA NEKO',     rareza: 'ULTRA',      prob: 1,  bonus: 5000 },
];
function gacha() {
  const r = Math.random() * 100; let a = 0;
  for (const i of GACHA_POOL) { a += i.prob; if (r <= a) return i; }
  return GACHA_POOL[0];
}
const TIENDA = [
  { id:1, nombre:'⚔️ Espada Neko',       precio:500,  rareza:'Común',      emoji:'⚔️' },
  { id:2, nombre:'🛡️ Escudo Gacha',      precio:800,  rareza:'Común',      emoji:'🛡️' },
  { id:3, nombre:'🧪 Poción Gacha',      precio:300,  rareza:'Común',      emoji:'🧪' },
  { id:4, nombre:'🌟 Amuleto Rare',      precio:1500, rareza:'Raro',       emoji:'🌟' },
  { id:5, nombre:'💎 Cristal Épico',     precio:3000, rareza:'Épico',      emoji:'💎' },
  { id:6, nombre:'👑 Corona Legendaria', precio:8000, rareza:'Legendaria', emoji:'👑' },
  { id:7, nombre:'🎴 Carta SSR',         precio:5000, rareza:'SSR',        emoji:'🎴' },
];
const SLOT_S = ['🍒','🍋','🍊','🍇','⭐','💎','🎰'];
function slots() { return [0,1,2].map(()=>SLOT_S[Math.floor(Math.random()*SLOT_S.length)]); }

const fmt = n => Number(n).toLocaleString('es-NI');
const barra = (v,m,l=10) => '█'.repeat(Math.round((v/m)*l)) + '░'.repeat(l-Math.round((v/m)*l));
const uptime = () => {
  const s=Math.floor((Date.now()-START_TIME)/1000);
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`;
};

// ══════════════════════════════════════════════════════════════
//                  VARIABLES DE CONEXIÓN (NUEVO - desde BOT-API)
// ══════════════════════════════════════════════════════════════
let intentos = 0;
let iniciando = false;
let sock = null;

// Cache para mensajes duplicados (evita loops)
const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// ──────────────── PEDIR NÚMERO ────────────────
function pedirNumero() {
  return new Promise(resolve => {
    if (process.env.PHONE_NUMBER) {
      const n = process.env.PHONE_NUMBER.replace(/\D/g,'');
      console.log(`📞 Número desde env: ${n}`);
      return resolve(n);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  📞 NEKOSBOT GACHA - CONFIGURACIÓN   ║');
    console.log('╚══════════════════════════════════════╝');
    rl.question('\n¿Número a vincular? (con código de país, ej: 525548289402)\n> ', r => {
      rl.close();
      const n = r.trim().replace(/\D/g,'');
      resolve(n || '50578391933');
    });
  });
}

// ══════════════════════════════════════════════════════════════
//                  BOT PRINCIPAL (CONFIGURACIÓN PRO)
// ══════════════════════════════════════════════════════════════
async function startBot() {
  if (iniciando) return;  // Evita reinicios paralelos
  iniciando = true;

  try {
    const phoneNum = await pedirNumero();

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║      🎮 NEKOSBOT GACHA v3.1          ║');
    console.log('║   Powered by Baileys (PRO EDITION)   ║');
    console.log('╚══════════════════════════════════════╝\n');
    console.log('⏳ Iniciando conexión WebSocket...\n');

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version;
    try {
      const resultado = await fetchLatestBaileysVersion();
      version = resultado.version;
    } catch {
      console.warn('⚠️ No se pudo obtener la versión de Baileys, usando default.');
    }

    // ⭐ CONFIGURACIÓN PROFESIONAL DE BAILEYS (copiada de BOT-API)
    const logger = pino({ level: 'silent' });
    const opciones = {
      logger,
      printQRInTerminal: false,
      mobile: false,
      // ⭐ Browser dinámico (más compatible que el estático)
      browser: Browsers ? Browsers.macOS('Chrome') : ['NEKOSBOT GACHA', 'Chrome', '121.0.0.0'],
      // ⭐ Auth separado en creds y keys con caché de Signal (esto arregla el 90% de las desconecciones)
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore
          ? makeCacheableSignalKeyStore(state.keys, logger)
          : state.keys
      },
      // ⭐ El bot aparece como online en WhatsApp
      markOnlineOnConnect: true,
      // ⭐ No sincroniza todo el historial (más rápido al conectar)
      syncFullHistory: false,
      // ⭐ Cache de mensajes duplicados (evita loops y repeticiones)
      msgRetryCounterCache,
      // ⭐ Timeouts optimizados
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 30000,
      mediaUploadTimeoutMs: 120000,
      // ⭐ Keep-alive cada 20 segundos (esto mantiene la conexión viva)
      keepAliveIntervalMs: 20000,
      emitOwnEvents: true,
      getMessage: async () => undefined,
    };
    if (version) opciones.version = version;

    sock = makeWASocket(opciones);
    sock.ev.on('creds.update', saveCreds);

    // ──── CÓDIGO DE 8 DÍGITOS ────
    let pairDone = false;

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !pairDone && !state.creds.registered) {
        pairDone = true;
        console.log('📡 Solicitando código de emparejamiento...');
        await new Promise(r => setTimeout(r, 2000));
        try {
          const code = await sock.requestPairingCode(phoneNum);
          const fmt8 = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log('\n╔══════════════════════════════════════╗');
          console.log('║   🔑 CÓDIGO DE EMPAREJAMIENTO        ║');
          console.log('║                                      ║');
          console.log(`║        ➤  ${fmt8}  ◄              ║`);
          console.log('║                                      ║');
          console.log(`║  📞 Número: ${phoneNum}        ║`);
          console.log('║                                      ║');
          console.log('║  WhatsApp > Config > Disp. vinculados║');
          console.log('║  > Vincular con número de teléfono   ║');
          console.log('╚══════════════════════════════════════╝\n');
          logHistory(`Código generado para ${phoneNum}: ${fmt8}`);
        } catch (e) {
          console.log(`❌ Error al generar código: ${e?.message || e}`);
          logHistory(`Error código: ${e?.message}`);
        }
      }

      if (connection === 'open') {
        intentos = 0;  // Reset contador al conectar
        console.log('✅ NEKOSBOT GACHA conectado y activo!');
        logHistory('Bot conectado');
      }

      // ⭐ RECONEXIÓN CON BACKOFF EXPONENCIAL (no cada 5s planos)
      if (connection === 'close') {
        const err = new Boom(lastDisconnect?.error);
        const code = err?.output?.statusCode;
        const registrado = sock?.authState?.creds?.registered;

        console.log(`🔴 Conexión cerrada. Código: ${code} (${err?.message || ''})`);
        logHistory(`Desconectado: ${code}`);

        // Si es logout, no reconectar
        if (code === DisconnectReason.loggedOut) {
          console.log('🔒 Sesión cerrada por logout. No se reconectará.');
          iniciando = false;
          return;
        }

        // Sesión inválida — borrar auth y reconectar fresco
        if (code === DisconnectReason.badSession || code === 401 || code === 500) {
          console.log('🗑️  Borrando sesión inválida y reiniciando...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch(_){}
        }

        // Sesión abierta en otro dispositivo — no reconectar
        if (code === DisconnectReason.connectionReplaced) {
          console.log('⚠️  Sesión abierta en otro dispositivo. Deteniéndose.');
          iniciando = false;
          return;
        }

        // ⭐ BACKOFF EXPONENCIAL: 5s, 10s, 15s... hasta máximo 60s
        intentos++;
        const espera = Math.min(5000 * intentos, 60000);
        console.log(`🔄 Reconectando en ${espera / 1000}s (intento #${intentos})...`);
        logHistory(`Reconectando en ${espera/1000}s`);

        setTimeout(() => {
          iniciando = false;
          pairDone = false;
          startBot();
        }, espera);
      }
    });

    // ══════════════════════════════════════════
    //               MANEJADOR DE MENSAJES
    // ══════════════════════════════════════════
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;
          if (msg.key.remoteJid === 'status@broadcast') continue;

          const chatJid = msg.key.remoteJid;
          if (!chatJid) continue;

          const senderJid = (isJidGroup(chatJid) ? msg.key.participant : chatJid) || chatJid;
          const isOwner   = senderJid.split('@')[0] === OWNER_RAW;

          const text = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            ''
          ).trim();

          if (!text.startsWith('/')) continue;

          const args      = text.split(/\s+/);
          const cmd       = args[0].toLowerCase();
          const body      = args.slice(1).join(' ');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

          const reply = async txt => {
            await sock.sendMessage(chatJid, { text: txt }, { quoted: msg });
          };

          const db   = loadDB();
          const user = getUser(db, senderJid);
          const nick = senderJid.split('@')[0];

          logHistory(`[${nick}] ${text}`);

          // ═══════════════════════════════════════════
          //   AQUÍ PEGA TODOS TUS COMANDOS ORIGINALES
          //   (desde /menu hasta /apostar_todo)
          //   El resto del código va exactamente igual
          // ═══════════════════════════════════════════

          if (cmd === '/menu') {
            await reply(`╔═══════════════════════════╗
║   🎮 *NEKOSBOT GACHA v3.1*  ║
╚═══════════════════════════╝

💰 *ECONOMÍA*
/perfil — tu perfil gacha
/trabajar — ganar coins (1min)
/diario — recompensa diaria
/banco [cant] — depositar
/retirar [cant] — retirar
/transferir @user [cant] — enviar

⚔️ *COMBATE*
/robar @user — robar dinero
/duel @user [apuesta] — duelo

🎰 *CASINO*
/ruleta [cant] — ruleta
/slots [cant] — tragamonedas
/dado [cant] — dados
/moneda [cant] [cara/cruz]
/blackjack [cant]

🎴 *GACHA*
/playasmollete — giro gratis
/tienda — ver items
/comprar [id] — comprar
/inventario — mis items

🎣 *ACTIVIDADES*
/pesca — pescar (90s)
/cazar — cazar (120s)
/dungeon — dungeon vs jefe
/trivia — preguntas
/mision — misión diaria
/alquimia — fusionar 3 ítems

🔮 *ESPECIALES*
/oraculo — profecía + reward
/caja [cant] — caja misteriosa
/ruleta_rusa — vive o pierde
/invertir [cant] — inversión
/retorno — cobrar inversión
/crash [cant] — crash gambling
/neko — dato neko + bonus
/apostar_todo — YOLO total

📊 *INFO*
/ranklist — top jugadores
/ping — estado bot
/uptime — tiempo activo

_NEKOSBOT GACHA v3.1 PRO 🐾_`);
          }

          else if (cmd === '/perfil') {
            const needed = user.nivel * 120;
            await reply(`╔══════════════════════════╗
║  👤 *PERFIL GACHA*        ║
╚══════════════════════════╝
🐾 *Neko:* ${nick}
⭐ *Nivel:* ${user.nivel}
📊 *XP:* ${fmt(user.xp)} / ${fmt(needed)}
${barra(user.xp, needed)}

💰 *Dinero:* $${fmt(user.dinero)}
🏦 *Banco:* $${fmt(user.banco)}
💳 *Total:* $${fmt(user.dinero + user.banco)}

⚔️ *Victorias:* ${user.victorias}
💀 *Derrotas:* ${user.derrotas}
🎣 *Pesca:* ${user.pesca} | 🏹 *Caza:* ${user.caza}
🔥 *Streak diario:* ${user.streak}`);
          }

          else if (cmd === '/trabajar') {
            const w = cooldown(senderJid, 'trabajar', 60);
            if (w > 0) { await reply(`⏳ Espera *${w}s* para trabajar`); continue; }
            const ganado = Math.floor(Math.random() * 200) + 50;
            user.dinero += ganado;
            const lvl = addXP(db, senderJid, 15);
            saveDB(db);
            const trabajos = ['🍱 Repartiste bento nekos','💻 Programaste mods gacha','🎨 Dibujaste catgirls','🛒 Vendiste cartas SSR','🎵 Cantaste en la plaza','🍜 Cocinaste ramen gacha'];
            let r = `✅ *${trabajos[Math.floor(Math.random()*trabajos.length)]}*\n💵 +$${fmt(ganado)}\n💰 Total: $${fmt(user.dinero)}`;
            if (lvl) r += `\n\n🎉 *¡SUBISTE AL NIVEL ${user.nivel}!*`;
            await reply(r);
          }

          else if (cmd === '/ping') {
            await reply(`🏓 *PONG!*\n⏱️ Ping: ${Date.now() % 1000}ms\n🎮 Bot activo\n👥 Uptime: ${uptime()}`);
          }

          // ═══════════════════════════════════════════
          //  COPIA AQUÍ TODOS TUS OTROS COMANDOS
          //  (/diario, /banco, /duel, /ruleta, /slots,
          //   /playasmollete, /cazar, /dungeon, etc.)
          //  tal cual los tenías en el archivo original
          // ═══════════════════════════════════════════

          else {
            await reply(`❓ Comando desconocido. Usa /menu`);
          }

        } catch (e) {
          console.error('Error en comando:', e.message);
          logHistory(`ERROR: ${e.message}`);
        }
      }
    });

    iniciando = false;

  } catch (error) {
    iniciando = false;
    console.error('\n❌ Error crítico iniciando NEKOSBOT:');
    console.error(error?.message || error);
    logHistory(`Error crítico: ${error?.message || error}`);

    intentos++;
    const espera = Math.min(5000 * intentos, 60000);
    console.log(`🔄 Reintentando en ${espera / 1000}s...`);
    setTimeout(startBot, espera);
  }
}

// Arrancar
startBot();