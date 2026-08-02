// ╔══════════════════════════════════════════════╗
// ║        NEKOSBOT GACHA v3.0                   ║
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
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const axios   = require('axios');
const fs      = require('fs');
const pino    = require('pino');

// ──────────────── CONFIG ────────────────
const OWNER_RAW = (process.env.OWNER || '50578391933').replace(/\D/g, '');
const OWNER_JID = `${OWNER_RAW}@s.whatsapp.net`;
const API_YT    = process.env.API_YT || 'lem916';
const API_TT    = process.env.API_TT || 'lem916';
const DB_PATH   = './database.json';
const HIST_DIR  = './documentos';
const HIST_PATH = `${HIST_DIR}/historial.txt`;
const AUTH_DIR  = './auth_info';
const START_TIME = Date.now();

// ──────────────── HEALTH SERVER (Render necesita PORT binding) ────────────────
const http = require('http');
const PORT_HTTP = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NEKOSBOT GACHA v3.0 🟢 Online\n');
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

// ──────────────── GACHA ────────────────
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

const TRIVIA_Q = [
  { p:'¿Capital de Nicaragua?', r:'managua', pista:'Empieza con M' },
  { p:'¿Lados de un hexágono?', r:'6', pista:'Un dígito' },
  { p:'¿Animal más rápido?',    r:'guepardo', pista:'Felino africano' },
  { p:'¿Año llegada a la luna?',r:'1969', pista:'Siglo XX' },
  { p:'¿Colores del arcoíris?', r:'7', pista:'Un dígito' },
];
const TRIVIA_ACTIVA = {};
const MISIONES = [
  { id:1, desc:'Pescar 3 veces',    tipo:'pesca',  meta:3, reward:400 },
  { id:2, desc:'Cazar 5 veces',     tipo:'caza',   meta:5, reward:600 },
  { id:3, desc:'Ganar 2 duelos',    tipo:'duel',   meta:2, reward:800 },
  { id:4, desc:'Trabajar 5 veces',  tipo:'work',   meta:5, reward:500 },
];

// ──────────────── UTILS ────────────────
const fmt  = n => Number(n).toLocaleString('es-NI');
const barra = (v,m,l=10) => '█'.repeat(Math.round((v/m)*l)) + '░'.repeat(l-Math.round((v/m)*l));
const uptime = () => {
  const s=Math.floor((Date.now()-START_TIME)/1000);
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`;
};

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

// ══════════════════════════════════════════
//                  BOT PRINCIPAL
// ══════════════════════════════════════════
async function startBot() {
  const phoneNum = await pedirNumero();

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      🎮 NEKOSBOT GACHA v3.0          ║');
  console.log('║   Powered by Baileys (sin Puppeteer) ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log('⏳ Iniciando conexión WebSocket...\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['NEKOSBOT GACHA', 'Chrome', '120.0.6099.109'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  // ──── CÓDIGO DE 8 DÍGITOS ────
  let pairDone = false;
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !pairDone) {
      pairDone = true;
      console.log('📡 Solicitando código de emparejamiento...');
      await new Promise(r => setTimeout(r, 1500));
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
        console.log(`🔑 TU CÓDIGO: ${fmt8}\n`);
        logHistory(`Código generado para ${phoneNum}: ${fmt8}`);
      } catch (e) {
        console.log(`❌ Error al generar código: ${e?.message || e}`);
        logHistory(`Error código: ${e?.message}`);
      }
    }

    if (connection === 'close') {
      const err  = new Boom(lastDisconnect?.error);
      const code = err?.output?.statusCode;
      console.log(`🔴 Conexión cerrada. Código: ${code} (${err?.message || ''})`);
      logHistory(`Desconectado: ${code}`);

      if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession || code === 401 || code === 500) {
        // Sesión inválida — borrar auth y reconectar fresco
        console.log('🗑️  Borrando sesión inválida y reiniciando...');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); fs.mkdirSync(AUTH_DIR, { recursive: true }); } catch(_){}
      }
      // Siempre reconectar salvo reemplazo de sesión en otro dispositivo
      if (code !== DisconnectReason.connectionReplaced) {
        pairDone = false;
        setTimeout(startBot, 5000);
      } else {
        console.log('⚠️  Sesión abierta en otro dispositivo. Deteniéndose.');
      }
    } else if (connection === 'open') {
      console.log('✅ NEKOSBOT GACHA conectado y activo!');
      logHistory('Bot conectado');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ══════════════════════════════════════════
  //               MANEJADOR DE MENSAJES
  // ══════════════════════════════════════════
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;

        const chatJid  = msg.key.remoteJid;
        if (!chatJid) continue;

        const senderJid = (isJidGroup(chatJid) ? msg.key.participant : chatJid) || chatJid;
        const isOwner   = senderJid.split('@')[0] === OWNER_RAW;

        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          ''
        ).trim();

        if (!text.startsWith('/')) continue;

        const args     = text.split(/\s+/);
        const cmd      = args[0].toLowerCase();
        const body     = args.slice(1).join(' ');
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        const reply = async txt => {
          await sock.sendMessage(chatJid, { text: txt }, { quoted: msg });
        };

        const db   = loadDB();
        const user = getUser(db, senderJid);
        const nick = senderJid.split('@')[0];

        logHistory(`[${nick}] ${text}`);

        // ──────────── /menu ────────────
        if (cmd === '/menu') {
          await reply(`╔═══════════════════════════╗
║   🎮 *NEKOSBOT GACHA v3*   ║
╚═══════════════════════════╝

💰 *ECONOMÍA*
/perfil — tu perfil gacha
/trabajar — ganar coins (1min)
/diario — recompensa diaria
/banco [cant] — depositar
/retirar [cant] — retirar
/transferir @user [cant] — enviar
/regalo @user [cant] — regalar

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
/trivia — preguntas
/responder [resp] — trivia
/mision — misión diaria

📊 *INFO*
/ranklist — top jugadores
/ping — estado bot
/uptime — tiempo activo

🎵 *MEDIA (solo owner)*
/play [cancion] — MP3 YouTube
/yt [nombre] — info YouTube
/tt [url] — info TikTok

_NEKOSBOT GACHA v3.0 🐾_`);
        }

        // ──────────── /perfil ────────────
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

        // ──────────── /trabajar ────────────
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

        // ──────────── /diario ────────────
        else if (cmd === '/diario') {
          const LIMIT = 20 * 3600 * 1000;
          const ahora = Date.now();
          if (ahora - user.ultimoDiario < LIMIT) {
            const rest = Math.ceil((LIMIT - (ahora - user.ultimoDiario)) / 3600000);
            await reply(`⏳ Ya reclamaste tu diario. Vuelve en *${rest}h*`); continue;
          }
          user.streak = (ahora - user.ultimoDiario < 24 * 3600 * 1000) ? user.streak + 1 : 1;
          user.ultimoDiario = ahora;
          const total = 300 + user.streak * 50;
          user.dinero += total;
          addXP(db, senderJid, 30);
          saveDB(db);
          await reply(`🎁 *RECOMPENSA DIARIA*\n💰 +$${fmt(300)}\n🔥 Streak x${user.streak}: +$${fmt(user.streak*50)}\n✨ Total: *$${fmt(total)}*\n💳 Saldo: $${fmt(user.dinero)}`);
        }

        // ──────────── /banco ────────────
        else if (cmd === '/banco') {
          const cant = parseInt(args[1]);
          if (!cant || cant <= 0) { await reply('❌ Uso: /banco [cantidad]'); continue; }
          if (user.dinero < cant) { await reply(`❌ Solo tienes $${fmt(user.dinero)}`); continue; }
          user.dinero -= cant; user.banco += cant;
          saveDB(db);
          await reply(`🏦 Depositaste *$${fmt(cant)}*\n💰 Dinero: $${fmt(user.dinero)}\n🏦 Banco: $${fmt(user.banco)}`);
        }

        // ──────────── /retirar ────────────
        else if (cmd === '/retirar') {
          const cant = parseInt(args[1]);
          if (!cant || cant <= 0) { await reply('❌ Uso: /retirar [cantidad]'); continue; }
          if (user.banco < cant) { await reply(`❌ Solo tienes $${fmt(user.banco)} en banco`); continue; }
          user.banco -= cant; user.dinero += cant;
          saveDB(db);
          await reply(`💳 Retiraste *$${fmt(cant)}*\n💰 Dinero: $${fmt(user.dinero)}\n🏦 Banco: $${fmt(user.banco)}`);
        }

        // ──────────── /transferir ────────────
        else if (cmd === '/transferir') {
          const cant = parseInt(args[2] || args[1]);
          if (!mentioned.length || !cant || cant <= 0) { await reply('❌ Uso: /transferir @user [cantidad]'); continue; }
          if (user.dinero < cant) { await reply(`❌ Solo tienes $${fmt(user.dinero)}`); continue; }
          const target = mentioned[0];
          const tUser  = getUser(db, target);
          user.dinero -= cant; tUser.dinero += cant;
          saveDB(db);
          await reply(`💸 Transferiste *$${fmt(cant)}* a @${target.split('@')[0]}\n💰 Tu saldo: $${fmt(user.dinero)}`);
        }

        // ──────────── /regalo ────────────
        else if (cmd === '/regalo') {
          const cant = parseInt(args[2] || args[1]);
          if (!mentioned.length || !cant || cant <= 0) { await reply('❌ Uso: /regalo @user [cantidad]'); continue; }
          if (user.dinero < cant) { await reply(`❌ Solo tienes $${fmt(user.dinero)}`); continue; }
          const tUser = getUser(db, mentioned[0]);
          user.dinero -= cant; tUser.dinero += cant;
          addXP(db, senderJid, 5);
          saveDB(db);
          await reply(`🎁 Regalaste *$${fmt(cant)}* a @${mentioned[0].split('@')[0]}\n💰 Tu saldo: $${fmt(user.dinero)}`);
        }

        // ──────────── /robar ────────────
        else if (cmd === '/robar') {
          const w = cooldown(senderJid, 'robar', 300);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          if (!mentioned.length) { await reply('❌ Uso: /robar @usuario'); continue; }
          const target = mentioned[0];
          if (target === senderJid) { await reply('🤡 No puedes robarte a ti mismo'); continue; }
          const victim = getUser(db, target);
          if (victim.dinero < 100) { await reply('💀 Está en quiebra, no vale la pena'); continue; }
          if (Math.random() < 0.6) {
            const robado = Math.floor(victim.dinero * 0.25);
            victim.dinero -= robado; user.dinero += robado;
            addXP(db, senderJid, 20); saveDB(db);
            await reply(`🦹 *ROBO EXITOSO!*\n💰 Robaste $${fmt(robado)} a @${target.split('@')[0]}\n💳 Tu dinero: $${fmt(user.dinero)}`);
          } else {
            const multa = Math.floor(user.dinero * 0.10);
            user.dinero = Math.max(0, user.dinero - multa); saveDB(db);
            await reply(`👮 *FALLASTE! Te atraparon!*\n💸 Multa: -$${fmt(multa)}\n💰 Tu dinero: $${fmt(user.dinero)}`);
          }
        }

        // ──────────── /duel ────────────
        else if (cmd === '/duel') {
          const w = cooldown(senderJid, 'duel', 120);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          if (!mentioned.length) { await reply('❌ Uso: /duel @usuario [apuesta]'); continue; }
          const apuesta = parseInt(args[2] || args[1]) || 200;
          const target = mentioned[0];
          if (target === senderJid) { await reply('🤡 No puedes duelarte solo'); continue; }
          if (user.dinero < apuesta) { await reply(`❌ No tienes $${fmt(apuesta)}`); continue; }
          const rival = getUser(db, target);
          if (rival.dinero < apuesta) { await reply(`❌ El rival no tiene $${fmt(apuesta)}`); continue; }
          const gana = Math.random() < 0.5;
          if (gana) {
            user.dinero += apuesta; rival.dinero -= apuesta;
            user.victorias++; rival.derrotas++;
            addXP(db, senderJid, 40);
          } else {
            user.dinero -= apuesta; rival.dinero += apuesta;
            user.derrotas++; rival.victorias++;
            addXP(db, target, 40);
          }
          saveDB(db);
          const ataques = ['⚔️','🔥','💥','🌪️','❄️','⚡'];
          const atk = ataques[Math.floor(Math.random()*ataques.length)];
          await reply(`${atk} *DUELO!*\n👤 ${nick} vs @${target.split('@')[0]}\n\n🏆 Ganó: *${gana ? nick : target.split('@')[0]}*\n💰 Ganancia: +$${fmt(apuesta)}`);
        }

        // ──────────── /ruleta ────────────
        else if (cmd === '/ruleta') {
          const w = cooldown(senderJid, 'ruleta', 15);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const apuesta = parseInt(args[1]) || 100;
          if (user.dinero < apuesta) { await reply(`❌ No tienes $${fmt(apuesta)}`); continue; }
          const num = Math.floor(Math.random() * 37);
          const rojo = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
          const color = num === 0 ? '🟢' : rojo.includes(num) ? '🔴' : '⚫';
          if (Math.random() < 0.48) {
            user.dinero += apuesta;
            addXP(db, senderJid, 10); saveDB(db);
            await reply(`🎰 *RULETA!* ${num} ${color}\n✅ GANASTE +$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
          } else {
            user.dinero -= apuesta; saveDB(db);
            await reply(`🎰 *RULETA!* ${num} ${color}\n❌ PERDISTE -$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
          }
        }

        // ──────────── /slots ────────────
        else if (cmd === '/slots') {
          const w = cooldown(senderJid, 'slots', 20);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const apuesta = parseInt(args[1]) || 100;
          if (user.dinero < apuesta) { await reply(`❌ No tienes $${fmt(apuesta)}`); continue; }
          const [a,b,c] = slots();
          let multi = 0;
          if (a===b && b===c) multi = a==='💎'?10:a==='⭐'?7:4;
          else if (a===b || b===c || a===c) multi = 1.5;
          const ganancia = Math.floor(apuesta * multi) - apuesta;
          user.dinero = Math.max(0, user.dinero + ganancia);
          if (multi > 0) addXP(db, senderJid, 15);
          saveDB(db);
          const res = multi > 1 ? `🎉 *JACKPOT x${multi}!* +$${fmt(Math.floor(apuesta*multi))}` : multi > 0 ? `✅ Par! +$${fmt(Math.floor(apuesta*1.5))}` : `❌ -$${fmt(apuesta)}`;
          await reply(`🎰 *TRAGAMONEDAS*\n[ ${a} | ${b} | ${c} ]\n\n${res}\n💰 Saldo: $${fmt(user.dinero)}`);
        }

        // ──────────── /dado ────────────
        else if (cmd === '/dado') {
          const w = cooldown(senderJid, 'dado', 10);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const apuesta = parseInt(args[1]) || 50;
          if (user.dinero < apuesta) { await reply(`❌ No tienes $${fmt(apuesta)}`); continue; }
          const bot2 = Math.ceil(Math.random()*6), jugador = Math.ceil(Math.random()*6);
          const em = ['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
          if (jugador > bot2) {
            user.dinero += apuesta; saveDB(db);
            await reply(`🎲 Tú: ${em[jugador]} | Bot: ${em[bot2]}\n✅ GANASTE +$${fmt(apuesta)}\n💰 $${fmt(user.dinero)}`);
          } else if (bot2 > jugador) {
            user.dinero -= apuesta; saveDB(db);
            await reply(`🎲 Tú: ${em[jugador]} | Bot: ${em[bot2]}\n❌ PERDISTE -$${fmt(apuesta)}\n💰 $${fmt(user.dinero)}`);
          } else {
            await reply(`🎲 Tú: ${em[jugador]} | Bot: ${em[bot2]}\n🤝 EMPATE`);
          }
        }

        // ──────────── /moneda ────────────
        else if (cmd === '/moneda') {
          const w = cooldown(senderJid, 'moneda', 10);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const apuesta = parseInt(args[1]) || 50;
          const lado = (args[2] || '').toLowerCase();
          if (!['cara','cruz'].includes(lado)) { await reply('❌ Uso: /moneda [cant] [cara/cruz]'); continue; }
          if (user.dinero < apuesta) { await reply(`❌ No tienes $${fmt(apuesta)}`); continue; }
          const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
          if (resultado === lado) {
            user.dinero += apuesta; saveDB(db);
            await reply(`🪙 *${resultado.toUpperCase()}!*\n✅ ACERTASTE +$${fmt(apuesta)}\n💰 $${fmt(user.dinero)}`);
          } else {
            user.dinero -= apuesta; saveDB(db);
            await reply(`🪙 *${resultado.toUpperCase()}!*\n❌ FALLASTE -$${fmt(apuesta)}\n💰 $${fmt(user.dinero)}`);
          }
        }

        // ──────────── /blackjack ────────────
        else if (cmd === '/blackjack') {
          const w = cooldown(senderJid, 'bj', 15);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const apuesta = parseInt(args[1]) || 100;
          if (user.dinero < apuesta) { await reply(`❌ No tienes $${fmt(apuesta)}`); continue; }
          const card = () => Math.min(Math.ceil(Math.random()*13), 10);
          const j = card()+card(), b = card()+card();
          let res = j===21?'BLACKJACK':j>21?'BUST':b>21?'WIN':j>b?'WIN':j===b?'DRAW':'LOSE';
          if (['BLACKJACK','WIN'].includes(res)) {
            const g = res==='BLACKJACK' ? Math.floor(apuesta*1.5) : apuesta;
            user.dinero += g; saveDB(db);
            await reply(`🃏 *BLACKJACK!*\nTú: ${j} | Bot: ${b}\n🎉 ${res}! +$${fmt(g)}\n💰 $${fmt(user.dinero)}`);
          } else if (res==='DRAW') {
            await reply(`🃏 Tú: ${j} | Bot: ${b}\n🤝 EMPATE`);
          } else {
            user.dinero -= apuesta; saveDB(db);
            await reply(`🃏 Tú: ${j} | Bot: ${b}\n💀 ${res} -$${fmt(apuesta)}\n💰 $${fmt(user.dinero)}`);
          }
        }

        // ──────────── /playasmollete ────────────
        else if (cmd === '/playasmollete') {
          const w = cooldown(senderJid, 'gacha', 30);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const item = gacha();
          const coins = Math.floor(Math.random()*200) + item.bonus;
          user.dinero += coins;
          user.inventario.push({ nombre: item.nombre, fecha: Date.now() });
          if (user.inventario.length > 50) user.inventario.shift();
          addXP(db, senderJid, 25); saveDB(db);
          const m = {'Común':'⬜','Raro':'🟦','Épico':'🟣','Legendaria':'🟡','ULTRA':'✨'};
          const marco = m[item.rareza] || '⬜';
          await reply(`${marco.repeat(5)}\n🎴 *PLAYASMOLLETE GACHA!*\n${marco.repeat(5)}\n\n✨ Obtuviste: *${item.nombre}*\n🏅 Rareza: *${item.rareza}*\n💰 +$${fmt(coins)}\n💳 Saldo: $${fmt(user.dinero)}`);
        }

        // ──────────── /tienda ────────────
        else if (cmd === '/tienda') {
          let txt = '🏪 *TIENDA NEKOSBOT*\n\n';
          for (const i of TIENDA) txt += `*[${i.id}]* ${i.nombre} — $${fmt(i.precio)} (${i.rareza})\n`;
          txt += '\n_/comprar [id] para comprar_';
          await reply(txt);
        }

        // ──────────── /comprar ────────────
        else if (cmd === '/comprar') {
          const id = parseInt(args[1]);
          const item = TIENDA.find(i => i.id === id);
          if (!item) { await reply('❌ ID inválido. Usa /tienda'); continue; }
          if (user.dinero < item.precio) { await reply(`❌ Te faltan $${fmt(item.precio - user.dinero)}`); continue; }
          user.dinero -= item.precio;
          user.inventario.push({ nombre: item.nombre, emoji: item.emoji, fecha: Date.now() });
          addXP(db, senderJid, 10); saveDB(db);
          await reply(`✅ Compraste *${item.nombre}*!\n💸 -$${fmt(item.precio)}\n💳 Saldo: $${fmt(user.dinero)}`);
        }

        // ──────────── /inventario ────────────
        else if (cmd === '/inventario') {
          if (!user.inventario.length) { await reply('🎒 Inventario vacío! Usa /playasmollete'); continue; }
          const items = user.inventario.slice(-15).map((i,x) => `${x+1}. ${i.emoji||'🎴'} ${i.nombre}`).join('\n');
          await reply(`🎒 *INVENTARIO* (${user.inventario.length} items)\n\n${items}`);
        }

        // ──────────── /pesca ────────────
        else if (cmd === '/pesca') {
          const w = cooldown(senderJid, 'pesca', 90);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const peces = [
            {e:'🐟',n:'Pez común',v:80},{e:'🐠',n:'Pez tropical',v:150},
            {e:'🦈',n:'¡TIBURÓN!',v:500},{e:'🐙',n:'Pulpo',v:300},
            {e:'🦞',n:'Langosta',v:400},{e:'💀',n:'Bota vieja',v:10},
          ];
          const pez = peces[Math.floor(Math.random()*peces.length)];
          user.dinero += pez.v; user.pesca++;
          addXP(db, senderJid, 12); saveDB(db);
          await reply(`🎣 *PESCA!*\n${pez.e} Pescaste: *${pez.n}*\n💰 +$${fmt(pez.v)}\n🎣 Total: ${user.pesca}`);
        }

        // ──────────── /cazar ────────────
        else if (cmd === '/cazar') {
          const w = cooldown(senderJid, 'cazar', 120);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const presas = [
            {e:'🐇',n:'Conejo',v:100},{e:'🦊',n:'Zorro',v:250},
            {e:'🐗',n:'Jabalí',v:350},{e:'🦌',n:'Ciervo',v:400},
            {e:'🐻',n:'¡OSO!',v:600},{e:'🦁',n:'¡LEÓN!',v:900},
            {e:'❌',n:'Nada',v:0},
          ];
          const presa = presas[Math.floor(Math.random()*presas.length)];
          user.dinero += presa.v; user.caza++;
          addXP(db, senderJid, 15); saveDB(db);
          await reply(`🏹 *CAZA!*\n${presa.e} Cazaste: *${presa.n}*\n💰 +$${fmt(presa.v)}\n🏹 Total: ${user.caza}`);
        }

        // ──────────── /trivia ────────────
        else if (cmd === '/trivia') {
          const w = cooldown(senderJid, 'trivia', 60);
          if (w > 0) { await reply(`⏳ Cooldown: *${w}s*`); continue; }
          const q = TRIVIA_Q[Math.floor(Math.random()*TRIVIA_Q.length)];
          TRIVIA_ACTIVA[senderJid] = { r: q.r, ts: Date.now() };
          await reply(`🧠 *TRIVIA!*\n\n❓ ${q.p}\n💡 Pista: _${q.pista}_\n⏱️ 30 segundos!\nResponde con /responder [respuesta]`);
        }

        // ──────────── /responder ────────────
        else if (cmd === '/responder') {
          const t = TRIVIA_ACTIVA[senderJid];
          if (!t) { await reply('❌ No tienes trivia activa. Usa /trivia'); continue; }
          if (Date.now() - t.ts > 30000) { delete TRIVIA_ACTIVA[senderJid]; await reply('⏰ Tiempo agotado!'); continue; }
          if (body.toLowerCase().trim() === t.r) {
            user.dinero += 300; addXP(db, senderJid, 30); saveDB(db);
            delete TRIVIA_ACTIVA[senderJid];
            await reply(`✅ *¡CORRECTO!*\n💰 +$300\n💳 Saldo: $${fmt(user.dinero)}`);
          } else {
            delete TRIVIA_ACTIVA[senderJid];
            await reply(`❌ Incorrecto! La respuesta era: *${t.r}*`);
          }
        }

        // ──────────── /mision ────────────
        else if (cmd === '/mision') {
          if (!user.misionActual) {
            const m = MISIONES[Math.floor(Math.random()*MISIONES.length)];
            user.misionActual = m.id; user.misionProgreso = 0;
            saveDB(db);
            await reply(`🎯 *MISIÓN ASIGNADA*\n📋 ${m.desc}\n🎯 Meta: ${m.meta}\n💰 Recompensa: $${fmt(m.reward)}`);
          } else {
            const m = MISIONES.find(x => x.id === user.misionActual);
            await reply(`🎯 *MISIÓN ACTIVA*\n📋 ${m.desc}\n📊 Progreso: ${user.misionProgreso}/${m.meta}\n💰 Recompensa: $${fmt(m.reward)}`);
          }
        }

        // ──────────── /ranklist ────────────
        else if (cmd === '/ranklist' || cmd === '/top') {
          const top = Object.entries(loadDB().users)
            .map(([id,u]) => ({ id: id.split('@')[0], total: u.dinero+u.banco, nivel: u.nivel }))
            .sort((a,b) => b.total - a.total).slice(0,10);
          const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          let txt = '🏆 *TOP JUGADORES NEKOSBOT*\n\n';
          top.forEach((u,i) => { txt += `${medals[i]} *${u.id}* — Lv.${u.nivel} — $${fmt(u.total)}\n`; });
          await reply(txt || 'Sin datos aún');
        }

        // ──────────── /ping ────────────
        else if (cmd === '/ping') {
          const t = Date.now();
          await sock.sendMessage(chatJid, { text: `🏓 *NEKOSBOT ONLINE*\n⚡ Latencia: ${Date.now()-t}ms\n✅ Estado: Activo` }, { quoted: msg });
        }

        // ──────────── /uptime ────────────
        else if (cmd === '/uptime') {
          await reply(`⏱️ *UPTIME NEKOSBOT*\n🟢 Activo hace: *${uptime()}*`);
        }

        // ══ OWNER ONLY ══

        // ──────────── /play ────────────
        else if (cmd === '/play') {
          if (!isOwner) { await reply('🔒 Solo el owner'); continue; }
          if (!body) { await reply('❌ Uso: /play [canción]'); continue; }
          await reply(`🔍 Buscando: *${body}*...`);
          try {
            const { data } = await axios.get(`https://api.lem916.com/api/download/ytmp3?url=${encodeURIComponent(body)}&apikey=${API_YT}`, { timeout:30000 });
            const link = data.download_url || data.url || data.link;
            const titulo = data.title || body;
            await reply(`🎵 *${titulo}*\n📥 ${link || 'No disponible'}`);
          } catch(e) { await reply(`❌ Error: ${e.message}`); }
        }

        // ──────────── /yt ────────────
        else if (cmd === '/yt') {
          if (!isOwner) { await reply('🔒 Solo el owner'); continue; }
          if (!body) { await reply('❌ Uso: /yt [nombre/url]'); continue; }
          await reply(`🔍 Buscando en YouTube...`);
          try {
            const { data } = await axios.get(`https://api.lem916.com/api/download/ytmp3?url=${encodeURIComponent(body)}&apikey=${API_YT}`, { timeout:30000 });
            await reply(`🎬 *INFO YOUTUBE*\n📌 ${data.title||'Sin título'}\n⏱️ ${data.duration||'N/A'}\n🔗 ${data.download_url||data.url||'No disponible'}`);
          } catch(e) { await reply(`❌ Error: ${e.message}`); }
        }

        // ──────────── /tt ────────────
        else if (cmd === '/tt') {
          if (!isOwner) { await reply('🔒 Solo el owner'); continue; }
          if (!body) { await reply('❌ Uso: /tt [url tiktok]'); continue; }
          await reply(`🔍 Procesando TikTok...`);
          try {
            const { data } = await axios.get(`https://api.lem916.com/api/download/tiktok?url=${encodeURIComponent(body)}&apikey=${API_TT}`, { timeout:30000 });
            await reply(`🎵 *INFO TIKTOK*\n👤 ${data.author||'?'}\n📌 ${data.title||data.desc||'Sin título'}\n🔗 ${data.download_url||data.url||data.video||'No disponible'}`);
          } catch(e) { await reply(`❌ Error: ${e.message}`); }
        }

      } catch (e) {
        console.error('Error en comando:', e.message);
        logHistory(`ERROR: ${e.message}`);
      }
    }
  });
}

// Arrancar
startBot().catch(err => {
  console.error('Error crítico:', err);
  logHistory(`Error crítico: ${err.message}`);
  setTimeout(startBot, 10000);
});
