// ╔══════════════════════════════════════════════╗
// ║        NEKOSBOT GACHA - by lopezdavison7     ║
// ║   WhatsApp Bot con sistema Gacha completo    ║
// ╚══════════════════════════════════════════════╝

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ──────────────── CONFIG ────────────────
const OWNER      = process.env.OWNER   || '50578391933@c.us';
const API_YT     = process.env.API_YT  || 'lem916';
const API_TT     = process.env.API_TT  || 'lem916';
const PHONE_NUM  = '50578391933';          // número a vincular
const DB_PATH    = './database.json';
const HIST_DIR   = './documentos';
const HIST_PATH  = `${HIST_DIR}/historial.txt`;
const START_TIME = Date.now();

// ──────────────── DIRECTORIOS ────────────────
if (!fs.existsSync(HIST_DIR)) fs.mkdirSync(HIST_DIR, { recursive: true });
if (!fs.existsSync(HIST_PATH)) fs.writeFileSync(HIST_PATH, `=== HISTORIAL NEKOSBOT GACHA ===\n`);

// ──────────────── DATABASE ────────────────
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: {}, cooldowns: {}, misiones: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch { return { users: {}, cooldowns: {}, misiones: {} }; }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(db, id) {
  if (!db.users[id]) {
    db.users[id] = {
      dinero: 500,
      banco: 0,
      nivel: 1,
      xp: 0,
      inventario: [],
      victorias: 0,
      derrotas: 0,
      pesca: 0,
      caza: 0,
      streak: 0,
      ultimoDiario: 0,
      misionActual: null,
      misionProgreso: 0,
      creado: Date.now()
    };
  }
  return db.users[id];
}

function addXP(db, id, cantidad) {
  const u = getUser(db, id);
  u.xp += cantidad;
  const needed = u.nivel * 120;
  if (u.xp >= needed) {
    u.xp -= needed;
    u.nivel += 1;
    return true;
  }
  return false;
}

function logHistory(texto) {
  const linea = `[${new Date().toLocaleString('es-NI')}] ${texto}\n`;
  fs.appendFileSync(HIST_PATH, linea);
}

// ──────────────── COOLDOWNS ────────────────
const COOLDOWNS = {};
function cooldown(userId, cmd, segundos) {
  const key = `${userId}:${cmd}`;
  const ahora = Date.now();
  if (COOLDOWNS[key] && ahora - COOLDOWNS[key] < segundos * 1000) {
    const restante = Math.ceil((segundos * 1000 - (ahora - COOLDOWNS[key])) / 1000);
    return restante;
  }
  COOLDOWNS[key] = ahora;
  return 0;
}

// ──────────────── GACHA ITEMS ────────────────
const TIENDA_ITEMS = [
  { id: 1, nombre: '⚔️ Espada Neko',      precio: 500,  rareza: 'Común',    emoji: '⚔️' },
  { id: 2, nombre: '🛡️ Escudo Gacha',     precio: 800,  rareza: 'Común',    emoji: '🛡️' },
  { id: 3, nombre: '🧪 Poción Gacha',     precio: 300,  rareza: 'Común',    emoji: '🧪' },
  { id: 4, nombre: '🌟 Amuleto Rare',     precio: 1500, rareza: 'Raro',     emoji: '🌟' },
  { id: 5, nombre: '💎 Cristal Épico',    precio: 3000, rareza: 'Épico',    emoji: '💎' },
  { id: 6, nombre: '👑 Corona Legendaria',precio: 8000, rareza: 'Legendaria',emoji: '👑' },
  { id: 7, nombre: '🎴 Carta SSR',        precio: 5000, rareza: 'SSR',      emoji: '🎴' },
  { id: 8, nombre: '🍣 Neko Bento',       precio: 200,  rareza: 'Común',    emoji: '🍣' },
];

const GACHA_POOL = [
  { nombre: '⚔️ Espada Común', rareza: 'Común',     prob: 40, bonus: 50 },
  { nombre: '🏹 Arco Común',   rareza: 'Común',     prob: 30, bonus: 60 },
  { nombre: '🌟 Orbe Raro',    rareza: 'Raro',      prob: 15, bonus: 200 },
  { nombre: '💎 Gema Épica',   rareza: 'Épico',     prob: 10, bonus: 500 },
  { nombre: '👑 Corona SSR',   rareza: 'Legendaria',prob: 4,  bonus: 1500 },
  { nombre: '🎆 ULTRA NEKO',   rareza: 'ULTRA',     prob: 1,  bonus: 5000 },
];

function gacha() {
  const rand = Math.random() * 100;
  let acum = 0;
  for (const item of GACHA_POOL) {
    acum += item.prob;
    if (rand <= acum) return item;
  }
  return GACHA_POOL[0];
}

const EMOJI_RAREZA = {
  'Común': '⬜', 'Raro': '🟦', 'Épico': '🟣', 'Legendaria': '🟡', 'SSR': '🔴', 'ULTRA': '✨'
};

// ──────────────── MISIONES ────────────────
const MISIONES_LIST = [
  { id: 1, desc: 'Pescar 3 veces',     tipo: 'pesca', meta: 3, recompensa: 400 },
  { id: 2, desc: 'Cazar 5 veces',      tipo: 'caza',  meta: 5, recompensa: 600 },
  { id: 3, desc: 'Ganar 2 duelos',     tipo: 'duel',  meta: 2, recompensa: 800 },
  { id: 4, desc: 'Trabajar 5 veces',   tipo: 'work',  meta: 5, recompensa: 500 },
  { id: 5, desc: 'Ganar en ruleta x3', tipo: 'ruleta',meta: 3, recompensa: 700 },
];

// ──────────────── SLOTS ────────────────
const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰'];
function slots() {
  return [0,1,2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
}

// ──────────────── TRIVIA ────────────────
const TRIVIA_Q = [
  { p: '¿Capital de Nicaragua?', r: 'managua', pistas: 'Empieza con M' },
  { p: '¿Cuántos lados tiene un hexágono?', r: '6', pistas: 'Es un número de un dígito' },
  { p: '¿Cuál es el animal más rápido?', r: 'guepardo', pistas: 'Felino africano' },
  { p: '¿En qué año llegaron a la luna?', r: '1969', pistas: 'Siglo XX' },
  { p: '¿Cuántos colores tiene el arcoíris?', r: '7', pistas: 'Un dígito' },
];
const TRIVIA_ACTIVA = {};

// ──────────────── FORMATO ────────────────
function fmt(n) { return n.toLocaleString('es-NI'); }
function barra(val, max, largo = 10) {
  const lleno = Math.round((val / max) * largo);
  return '█'.repeat(lleno) + '░'.repeat(largo - lleno);
}
function uptime() {
  const s = Math.floor((Date.now() - START_TIME) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  return `${h}h ${m}m ${seg}s`;
}

// ──────────────── CLIENTE WHATSAPP ────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'nekosbot' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
      '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'
    ]
  }
});

console.log('\n╔══════════════════════════════════════╗');
console.log('║      🎮 NEKOSBOT GACHA v2.0          ║');
console.log('║   by lopezdavison7-ops               ║');
console.log('╚══════════════════════════════════════╝\n');
console.log('⏳ Iniciando bot...\n');

// ──── CÓDIGO DE 8 DÍGITOS ────
client.on('qr', async (qr) => {
  try {
    const code = await client.requestPairingCode(PHONE_NUM);
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  📱 CÓDIGO DE EMPAREJAMIENTO         ║');
    console.log(`║  🔑 CÓDIGO: ${code.padEnd(14)}         ║`);
    console.log(`║  📞 NÚMERO: ${PHONE_NUM.padEnd(13)}        ║`);
    console.log('║  Ingresa el código en WhatsApp:      ║');
    console.log('║  Ajustes > Dispositivos vinculados   ║');
    console.log('╚══════════════════════════════════════╝\n');
    logHistory(`Código de vinculación generado: ${code}`);
  } catch (e) {
    console.log('📸 QR alternativo (escanea con WhatsApp):');
    qrcode.generate(qr, { small: true });
  }
});

client.on('ready', () => {
  console.log('✅ NEKOSBOT GACHA conectado y listo!');
  console.log(`👑 Owner: ${OWNER}`);
  logHistory('Bot iniciado correctamente');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Error de autenticación:', msg);
  logHistory(`Error de autenticación: ${msg}`);
});

client.on('disconnected', (reason) => {
  console.log('❌ Bot desconectado:', reason);
  logHistory(`Bot desconectado: ${reason}`);
});

// ══════════════════════════════════════════
//               MANEJADOR DE MENSAJES
// ══════════════════════════════════════════
client.on('message', async (msg) => {
  if (msg.from === 'status@broadcast') return;
  if (!msg.body || !msg.body.startsWith('/')) return;

  const from    = msg.from;
  const isOwner = from === OWNER;
  const args    = msg.body.trim().split(/\s+/);
  const cmd     = args[0].toLowerCase();
  const texto   = args.slice(1).join(' ');
  const db      = loadDB();
  const user    = getUser(db, from);

  logHistory(`[${from}] ${msg.body}`);

  try {
    // ────────────────── /menu ──────────────────
    if (cmd === '/menu') {
      const menu = `╔═══════════════════════════╗
║   🎮 *NEKOSBOT GACHA*      ║
╚═══════════════════════════╝

💰 *ECONOMÍA*
/perfil — tu perfil gacha
/trabajar — ganar monedas (1min)
/diario — recompensa diaria
/banco [cant] — depositar
/retirar [cant] — retirar
/transferir @user [cant] — enviar

🗡️ *COMBATE*
/robar @user — robar dinero
/duel @user [apuesta] — duelo

🎰 *CASINO*
/ruleta [cant] — ruleta
/slots [cant] — tragamonedas
/dado [cant] — dados
/moneda [cant] — cara o cruz
/blackjack [cant] — blackjack

🎴 *GACHA*
/playasmollete — giro gacha gratis
/tienda — ver items
/comprar [id] — comprar item
/inventario — mis items

🎣 *ACTIVIDADES*
/pesca — pescar items
/cazar — cazar recursos
/trivia — trivia por dinero
/mision — misión diaria

📊 *INFO*
/ranklist — top jugadores
/ping — estado del bot
/uptime — tiempo activo

🎵 *MEDIA* _(solo owner)_
/play [cancion] — bajar MP3
/yt [nombre] — info YouTube
/tt [url] — info TikTok

_NEKOSBOT GACHA v2.0 🐾_`;
      await msg.reply(menu);
    }

    // ────────────────── /perfil ──────────────────
    else if (cmd === '/perfil') {
      const needed = user.nivel * 120;
      const topItems = user.inventario.slice(-3).map(i => i.emoji || '🎴').join('');
      const res = `╔══════════════════════════╗
║  👤 *PERFIL GACHA*        ║
╚══════════════════════════╝
🐾 *Neko:* ${from.split('@')[0]}
⭐ *Nivel:* ${user.nivel}
📊 *XP:* ${fmt(user.xp)} / ${fmt(needed)}
${barra(user.xp, needed)} 

💰 *Dinero:* $${fmt(user.dinero)}
🏦 *Banco:* $${fmt(user.banco)}
💳 *Total:* $${fmt(user.dinero + user.banco)}

⚔️ *Victorias:* ${user.victorias}
💀 *Derrotas:* ${user.derrotas}
🎣 *Pesca:* ${user.pesca} | 🏹 *Caza:* ${user.caza}

🎒 *Items recientes:* ${topItems || 'Ninguno'}
🗓️ *Streak diario:* 🔥${user.streak}`;
      await msg.reply(res);
    }

    // ────────────────── /trabajar ──────────────────
    else if (cmd === '/trabajar') {
      const wait = cooldown(from, 'trabajar', 60);
      if (wait > 0) return msg.reply(`⏳ Espera *${wait}s* para volver a trabajar!`);

      const ganado = Math.floor(Math.random() * 200) + 50;
      user.dinero += ganado;
      const levelUp = addXP(db, from, 15);
      saveDB(db);

      const trabajos = [
        '🍱 Repartiste bento nekos',
        '💻 Programaste mods gacha',
        '🎨 Dibujaste catgirls',
        '🛒 Vendiste cartas SSR',
        '🎵 Cantaste en la plaza',
        '🏪 Atendiste la tienda neko',
        '🍜 Cocinaste ramen gacha',
      ];
      const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
      let resp = `✅ *${trabajo}*\n💵 Ganaste: *$${fmt(ganado)}*\n💰 Total: *$${fmt(user.dinero)}*`;
      if (levelUp) resp += `\n\n🎉 *¡SUBISTE AL NIVEL ${user.nivel}!*`;
      await msg.reply(resp);
    }

    // ────────────────── /diario ──────────────────
    else if (cmd === '/diario') {
      const ahora = Date.now();
      const COOLDOWN_DIARIO = 20 * 60 * 60 * 1000; // 20h
      if (ahora - user.ultimoDiario < COOLDOWN_DIARIO) {
        const rest = Math.ceil((COOLDOWN_DIARIO - (ahora - user.ultimoDiario)) / 3600000);
        return msg.reply(`⏳ Ya reclamaste tu diario. Vuelve en *${rest}h*`);
      }
      user.ultimoDiario = ahora;
      // Streak
      const LIMIT_STREAK = 24 * 60 * 60 * 1000;
      user.streak = (ahora - user.ultimoDiario < LIMIT_STREAK) ? user.streak + 1 : 1;
      const base = 300;
      const bonus = user.streak * 50;
      const total = base + bonus;
      user.dinero += total;
      addXP(db, from, 30);
      saveDB(db);
      await msg.reply(`🎁 *RECOMPENSA DIARIA*\n💰 Base: $${fmt(base)}\n🔥 Streak x${user.streak}: +$${fmt(bonus)}\n✨ Total: *$${fmt(total)}*\n\n💳 Saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /banco ──────────────────
    else if (cmd === '/banco') {
      const cant = parseInt(args[1]);
      if (!cant || cant <= 0) return msg.reply('❌ Uso: /banco [cantidad]');
      if (user.dinero < cant) return msg.reply(`❌ No tienes suficiente. Tienes $${fmt(user.dinero)}`);
      user.dinero -= cant;
      user.banco += cant;
      saveDB(db);
      await msg.reply(`🏦 Depositaste *$${fmt(cant)}*\n💰 Dinero: $${fmt(user.dinero)}\n🏦 Banco: $${fmt(user.banco)}`);
    }

    // ────────────────── /retirar ──────────────────
    else if (cmd === '/retirar') {
      const cant = parseInt(args[1]);
      if (!cant || cant <= 0) return msg.reply('❌ Uso: /retirar [cantidad]');
      if (user.banco < cant) return msg.reply(`❌ No tienes suficiente en el banco. Tienes $${fmt(user.banco)}`);
      user.banco -= cant;
      user.dinero += cant;
      saveDB(db);
      await msg.reply(`💳 Retiraste *$${fmt(cant)}*\n💰 Dinero: $${fmt(user.dinero)}\n🏦 Banco: $${fmt(user.banco)}`);
    }

    // ────────────────── /transferir ──────────────────
    else if (cmd === '/transferir') {
      const mentioned = await msg.getMentions();
      const cant = parseInt(args[2] || args[1]);
      if (!mentioned.length || !cant || cant <= 0) return msg.reply('❌ Uso: /transferir @usuario [cantidad]');
      if (user.dinero < cant) return msg.reply(`❌ No tienes suficiente. Tienes $${fmt(user.dinero)}`);
      const target = mentioned[0].id._serialized;
      const targetUser = getUser(db, target);
      user.dinero -= cant;
      targetUser.dinero += cant;
      saveDB(db);
      await msg.reply(`💸 Transferiste *$${fmt(cant)}* a @${mentioned[0].id.user}\n💰 Tu saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /robar ──────────────────
    else if (cmd === '/robar') {
      const wait = cooldown(from, 'robar', 300);
      if (wait > 0) return msg.reply(`⏳ Cooldown de robo: *${wait}s*`);
      const mentioned = await msg.getMentions();
      if (!mentioned.length) return msg.reply('❌ Menciona a quien robarle: /robar @usuario');
      const target = mentioned[0].id._serialized;
      if (target === from) return msg.reply('🤡 No puedes robarte a ti mismo!');
      const victim = getUser(db, target);
      if (victim.dinero < 100) return msg.reply('💀 Esa persona está en quiebra, no vale la pena!');
      const exito = Math.random() < 0.60;
      if (exito) {
        const robado = Math.floor(victim.dinero * 0.25);
        victim.dinero -= robado;
        user.dinero += robado;
        addXP(db, from, 20);
        saveDB(db);
        await msg.reply(`🦹 *ROBO EXITOSO!*\n💰 Robaste $${fmt(robado)} a @${mentioned[0].id.user}\n💳 Tu dinero: $${fmt(user.dinero)}`);
      } else {
        const multa = Math.floor(user.dinero * 0.10);
        user.dinero = Math.max(0, user.dinero - multa);
        saveDB(db);
        await msg.reply(`👮 *FALLASTE!* Te atraparon!\n💸 Pagaste $${fmt(multa)} de multa\n💰 Tu dinero: $${fmt(user.dinero)}`);
      }
    }

    // ────────────────── /duel ──────────────────
    else if (cmd === '/duel') {
      const wait = cooldown(from, 'duel', 120);
      if (wait > 0) return msg.reply(`⏳ Cooldown de duelo: *${wait}s*`);
      const mentioned = await msg.getMentions();
      const apuesta = parseInt(args[2] || args[1]) || 200;
      if (!mentioned.length) return msg.reply('❌ Uso: /duel @usuario [apuesta]');
      const target = mentioned[0].id._serialized;
      if (target === from) return msg.reply('🤡 No puedes duelarte a ti mismo!');
      if (user.dinero < apuesta) return msg.reply(`❌ No tienes suficiente. Apuesta: $${fmt(apuesta)}`);
      const rival = getUser(db, target);
      if (rival.dinero < apuesta) return msg.reply(`❌ El rival no tiene $${fmt(apuesta)} para apostar!`);
      const ganaJugador = Math.random() < 0.5;
      if (ganaJugador) {
        user.dinero += apuesta;
        rival.dinero -= apuesta;
        user.victorias++;
        rival.derrotas++;
        addXP(db, from, 40);
      } else {
        user.dinero -= apuesta;
        rival.dinero += apuesta;
        user.derrotas++;
        rival.victorias++;
        addXP(db, target, 40);
      }
      saveDB(db);
      const ataques = ['⚔️','🔥','💥','🌪️','❄️','⚡'];
      const atk = ataques[Math.floor(Math.random() * ataques.length)];
      await msg.reply(`${atk} *DUELO!*\n👤 ${from.split('@')[0]} vs @${mentioned[0].id.user}\n\n${ganaJugador ? `🏆 Ganó: *${from.split('@')[0]}*\n💰 Ganancia: +$${fmt(apuesta)}` : `🏆 Ganó: *@${mentioned[0].id.user}*\n💰 Ganancia: +$${fmt(apuesta)}`}`);
    }

    // ────────────────── /ruleta ──────────────────
    else if (cmd === '/ruleta') {
      const wait = cooldown(from, 'ruleta', 15);
      if (wait > 0) return msg.reply(`⏳ Cooldown ruleta: *${wait}s*`);
      const apuesta = parseInt(args[1]) || 100;
      if (user.dinero < apuesta) return msg.reply(`❌ No tienes $${fmt(apuesta)}`);
      const num = Math.floor(Math.random() * 37);
      const rojo = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const color = num === 0 ? '🟢' : rojo.includes(num) ? '🔴' : '⚫';
      const gana = Math.random() < 0.48;
      if (gana) {
        user.dinero += apuesta;
        addXP(db, from, 10);
        saveDB(db);
        await msg.reply(`🎰 *RULETA!*\nNúmero: *${num}* ${color}\n\n✅ GANASTE +$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      } else {
        user.dinero -= apuesta;
        saveDB(db);
        await msg.reply(`🎰 *RULETA!*\nNúmero: *${num}* ${color}\n\n❌ PERDISTE -$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      }
    }

    // ────────────────── /slots ──────────────────
    else if (cmd === '/slots') {
      const wait = cooldown(from, 'slots', 20);
      if (wait > 0) return msg.reply(`⏳ Cooldown slots: *${wait}s*`);
      const apuesta = parseInt(args[1]) || 100;
      if (user.dinero < apuesta) return msg.reply(`❌ No tienes $${fmt(apuesta)}`);
      const [a, b, c] = slots();
      let multi = 0;
      if (a === b && b === c) {
        multi = a === '💎' ? 10 : a === '⭐' ? 7 : 4;
      } else if (a === b || b === c || a === c) {
        multi = 1.5;
      }
      const ganancia = Math.floor(apuesta * multi) - apuesta;
      user.dinero = Math.max(0, user.dinero + ganancia);
      if (multi > 0) addXP(db, from, 15);
      saveDB(db);
      const resultado = multi > 1 ? `🎉 *JACKPOT! x${multi}!*\n+$${fmt(Math.floor(apuesta * multi))}` : multi > 0 ? `✅ Par!\n+$${fmt(Math.floor(apuesta * 1.5))}` : `❌ Perdiste -$${fmt(apuesta)}`;
      await msg.reply(`🎰 *TRAGAMONEDAS*\n[ ${a} | ${b} | ${c} ]\n\n${resultado}\n💰 Saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /dado ──────────────────
    else if (cmd === '/dado') {
      const wait = cooldown(from, 'dado', 10);
      if (wait > 0) return msg.reply(`⏳ Cooldown: *${wait}s*`);
      const apuesta = parseInt(args[1]) || 50;
      if (user.dinero < apuesta) return msg.reply(`❌ No tienes $${fmt(apuesta)}`);
      const bot = Math.ceil(Math.random() * 6);
      const jugador = Math.ceil(Math.random() * 6);
      const emojis = ['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
      if (jugador > bot) {
        user.dinero += apuesta;
        saveDB(db);
        await msg.reply(`🎲 *DADOS!*\nTú: ${emojis[jugador]} | Bot: ${emojis[bot]}\n\n✅ GANASTE +$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      } else if (bot > jugador) {
        user.dinero -= apuesta;
        saveDB(db);
        await msg.reply(`🎲 *DADOS!*\nTú: ${emojis[jugador]} | Bot: ${emojis[bot]}\n\n❌ PERDISTE -$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      } else {
        await msg.reply(`🎲 *DADOS!*\nTú: ${emojis[jugador]} | Bot: ${emojis[bot]}\n\n🤝 EMPATE! Se devuelve la apuesta\n💰 Saldo: $${fmt(user.dinero)}`);
      }
    }

    // ────────────────── /moneda ──────────────────
    else if (cmd === '/moneda') {
      const wait = cooldown(from, 'moneda', 10);
      if (wait > 0) return msg.reply(`⏳ Cooldown: *${wait}s*`);
      const apuesta = parseInt(args[1]) || 50;
      const lado   = (args[2] || '').toLowerCase();
      if (!['cara', 'cruz'].includes(lado)) return msg.reply('❌ Uso: /moneda [cant] [cara/cruz]');
      if (user.dinero < apuesta) return msg.reply(`❌ No tienes $${fmt(apuesta)}`);
      const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
      const emoji = resultado === 'cara' ? '🪙' : '❌';
      if (resultado === lado) {
        user.dinero += apuesta;
        saveDB(db);
        await msg.reply(`${emoji} *${resultado.toUpperCase()}!*\n✅ ACERTASTE! +$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      } else {
        user.dinero -= apuesta;
        saveDB(db);
        await msg.reply(`${emoji} *${resultado.toUpperCase()}!*\n❌ FALLASTE! -$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      }
    }

    // ────────────────── /blackjack ──────────────────
    else if (cmd === '/blackjack') {
      const wait = cooldown(from, 'bj', 15);
      if (wait > 0) return msg.reply(`⏳ Cooldown BJ: *${wait}s*`);
      const apuesta = parseInt(args[1]) || 100;
      if (user.dinero < apuesta) return msg.reply(`❌ No tienes $${fmt(apuesta)}`);
      const card = () => {
        const c = Math.ceil(Math.random() * 13);
        return Math.min(c, 10);
      };
      const jugador = card() + card();
      const bot2 = card() + card();
      const busta = (n) => n > 21;
      let res = '';
      if (jugador === 21) res = 'BLACKJACK';
      else if (busta(jugador)) res = 'BUST';
      else if (busta(bot2)) res = 'WIN';
      else if (jugador > bot2) res = 'WIN';
      else if (jugador === bot2) res = 'DRAW';
      else res = 'LOSE';
      if (res === 'BLACKJACK' || res === 'WIN') {
        const g = res === 'BLACKJACK' ? Math.floor(apuesta * 1.5) : apuesta;
        user.dinero += g;
        saveDB(db);
        await msg.reply(`🃏 *BLACKJACK!*\nTú: ${jugador} | Bot: ${bot2}\n\n🎉 ${res}! +$${fmt(g)}\n💰 Saldo: $${fmt(user.dinero)}`);
      } else if (res === 'DRAW') {
        await msg.reply(`🃏 *BLACKJACK!*\nTú: ${jugador} | Bot: ${bot2}\n\n🤝 EMPATE\n💰 Saldo: $${fmt(user.dinero)}`);
      } else {
        user.dinero -= apuesta;
        saveDB(db);
        await msg.reply(`🃏 *BLACKJACK!*\nTú: ${jugador} | Bot: ${bot2}\n\n💀 ${res}! -$${fmt(apuesta)}\n💰 Saldo: $${fmt(user.dinero)}`);
      }
    }

    // ────────────────── /playasmollete ──────────────────
    else if (cmd === '/playasmollete') {
      const wait = cooldown(from, 'gacha', 30);
      if (wait > 0) return msg.reply(`⏳ Cooldown gacha: *${wait}s*`);
      const item = gacha();
      const coins = Math.floor(Math.random() * 200) + item.bonus;
      user.dinero += coins;
      user.inventario.push({ nombre: item.nombre, emoji: EMOJI_RAREZA[item.rareza], fecha: Date.now() });
      if (user.inventario.length > 50) user.inventario.shift();
      addXP(db, from, 25);
      saveDB(db);
      const marcos = {
        'Común': '⬜', 'Raro': '🟦', 'Épico': '🟣', 'Legendaria': '🟡', 'SSR': '🔴', 'ULTRA': '✨'
      };
      const marco = marcos[item.rareza] || '⬜';
      await msg.reply(`${marco}${marco}${marco}${marco}${marco}\n🎴 *PLAYASMOLLETE GACHA!*\n${marco}${marco}${marco}${marco}${marco}\n\n✨ Obtuviste: *${item.nombre}*\n🏅 Rareza: *${item.rareza}*\n💰 Coins: +$${fmt(coins)}\n\n💳 Saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /tienda ──────────────────
    else if (cmd === '/tienda') {
      let lista = '🏪 *TIENDA NEKOS*\n\n';
      for (const item of TIENDA_ITEMS) {
        lista += `*[${item.id}]* ${item.nombre} — $${fmt(item.precio)} (${item.rareza})\n`;
      }
      lista += '\n_/comprar [id] para comprar_';
      await msg.reply(lista);
    }

    // ────────────────── /comprar ──────────────────
    else if (cmd === '/comprar') {
      const id = parseInt(args[1]);
      const item = TIENDA_ITEMS.find(i => i.id === id);
      if (!item) return msg.reply('❌ ID inválido. Usa /tienda para ver los items');
      if (user.dinero < item.precio) return msg.reply(`❌ Te faltan $${fmt(item.precio - user.dinero)} para comprar ${item.nombre}`);
      user.dinero -= item.precio;
      user.inventario.push({ nombre: item.nombre, emoji: item.emoji, fecha: Date.now() });
      addXP(db, from, 10);
      saveDB(db);
      await msg.reply(`✅ Compraste *${item.nombre}*!\n💰 Gastaste: $${fmt(item.precio)}\n💳 Saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /inventario ──────────────────
    else if (cmd === '/inventario') {
      if (!user.inventario.length) return msg.reply('🎒 Tu inventario está vacío! Usa /playasmollete o /comprar');
      const items = user.inventario.slice(-15).map((i, idx) => `${idx+1}. ${i.emoji} ${i.nombre}`).join('\n');
      await msg.reply(`🎒 *INVENTARIO* (${user.inventario.length} items)\n\n${items}`);
    }

    // ────────────────── /pesca ──────────────────
    else if (cmd === '/pesca') {
      const wait = cooldown(from, 'pesca', 90);
      if (wait > 0) return msg.reply(`⏳ Cooldown pesca: *${wait}s*`);
      const peces = [
        { emoji: '🐟', nombre: 'Pez común', valor: 80 },
        { emoji: '🐠', nombre: 'Pez tropical', valor: 150 },
        { emoji: '🐡', nombre: 'Globo', valor: 120 },
        { emoji: '🦈', nombre: '¡TIBURÓN!', valor: 500 },
        { emoji: '🐙', nombre: 'Pulpo', valor: 300 },
        { emoji: '🦞', nombre: 'Langosta', valor: 400 },
        { emoji: '💀', nombre: 'Bota vieja', valor: 10 },
        { emoji: '🗑️', nombre: 'Basura', valor: 5 },
      ];
      const pez = peces[Math.floor(Math.random() * peces.length)];
      user.dinero += pez.valor;
      user.pesca++;
      addXP(db, from, 12);
      saveDB(db);
      await msg.reply(`🎣 *PESCA!*\n\nPescaste: ${pez.emoji} *${pez.nombre}*\n💰 Vendido por: +$${fmt(pez.valor)}\n🎣 Pescas totales: ${user.pesca}\n💳 Saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /cazar ──────────────────
    else if (cmd === '/cazar') {
      const wait = cooldown(from, 'cazar', 120);
      if (wait > 0) return msg.reply(`⏳ Cooldown caza: *${wait}s*`);
      const presas = [
        { emoji: '🐇', nombre: 'Conejo', valor: 100 },
        { emoji: '🦊', nombre: 'Zorro', valor: 250 },
        { emoji: '🐗', nombre: 'Jabalí', valor: 350 },
        { emoji: '🦌', nombre: 'Ciervo', valor: 400 },
        { emoji: '🐻', nombre: '¡OSO!', valor: 600 },
        { emoji: '🦁', nombre: '¡LEÓN!', valor: 900 },
        { emoji: '❌', nombre: 'Nada', valor: 0 },
      ];
      const presa = presas[Math.floor(Math.random() * presas.length)];
      user.dinero += presa.valor;
      user.caza++;
      addXP(db, from, 15);
      saveDB(db);
      await msg.reply(`🏹 *CAZA!*\n\nCazaste: ${presa.emoji} *${presa.nombre}*\n💰 Valor: +$${fmt(presa.valor)}\n🏹 Cazas totales: ${user.caza}\n💳 Saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /trivia ──────────────────
    else if (cmd === '/trivia') {
      const wait = cooldown(from, 'trivia', 60);
      if (wait > 0) return msg.reply(`⏳ Cooldown trivia: *${wait}s*`);
      const q = TRIVIA_Q[Math.floor(Math.random() * TRIVIA_Q.length)];
      TRIVIA_ACTIVA[from] = { resp: q.r, ts: Date.now() };
      await msg.reply(`🧠 *TRIVIA!*\n\n❓ ${q.p}\n\n💡 Pista: _${q.pistas}_\n⏱️ Tienes 30 segundos!\nResponde con /responder [tu respuesta]`);
    }

    // ────────────────── /responder ──────────────────
    else if (cmd === '/responder') {
      const trivia = TRIVIA_ACTIVA[from];
      if (!trivia) return msg.reply('❌ No tienes trivia activa. Usa /trivia');
      if (Date.now() - trivia.ts > 30000) {
        delete TRIVIA_ACTIVA[from];
        return msg.reply('⏰ Tiempo agotado! Usa /trivia para intentar de nuevo');
      }
      const resp = texto.toLowerCase().trim();
      if (resp === trivia.resp) {
        const premio = 300;
        user.dinero += premio;
        addXP(db, from, 30);
        saveDB(db);
        delete TRIVIA_ACTIVA[from];
        await msg.reply(`✅ *¡CORRECTO!*\n💰 Ganaste +$${fmt(premio)}\n💳 Saldo: $${fmt(user.dinero)}`);
      } else {
        delete TRIVIA_ACTIVA[from];
        await msg.reply(`❌ *Incorrecto!*\nLa respuesta era: *${trivia.resp}*`);
      }
    }

    // ────────────────── /mision ──────────────────
    else if (cmd === '/mision') {
      if (!user.misionActual) {
        const mision = MISIONES_LIST[Math.floor(Math.random() * MISIONES_LIST.length)];
        user.misionActual = mision.id;
        user.misionProgreso = 0;
        saveDB(db);
        await msg.reply(`🎯 *MISIÓN ASIGNADA*\n\n📋 ${mision.desc}\n🎯 Meta: ${mision.meta}\n💰 Recompensa: $${fmt(mision.recompensa)}\n\nProgreso: 0/${mision.meta}`);
      } else {
        const mision = MISIONES_LIST.find(m => m.id === user.misionActual);
        await msg.reply(`🎯 *MISIÓN ACTIVA*\n\n📋 ${mision.desc}\n📊 Progreso: ${user.misionProgreso}/${mision.meta}\n💰 Recompensa: $${fmt(mision.recompensa)}`);
      }
    }

    // ────────────────── /ranklist ──────────────────
    else if (cmd === '/ranklist' || cmd === '/top') {
      const top = Object.entries(db.users)
        .map(([id, u]) => ({ id: id.split('@')[0], total: u.dinero + u.banco, nivel: u.nivel }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      let txt = '🏆 *TOP JUGADORES NEKOSBOT*\n\n';
      top.forEach((u, i) => {
        txt += `${medals[i]} *${u.id}* — Lv.${u.nivel} — $${fmt(u.total)}\n`;
      });
      await msg.reply(txt || '📊 Aún no hay datos suficientes');
    }

    // ────────────────── /regalo ──────────────────
    else if (cmd === '/regalo') {
      const mentioned = await msg.getMentions();
      const cant = parseInt(args[2] || args[1]);
      if (!mentioned.length || !cant || cant <= 0) return msg.reply('❌ Uso: /regalo @usuario [cantidad]');
      if (user.dinero < cant) return msg.reply(`❌ No tienes suficiente. Tienes $${fmt(user.dinero)}`);
      const target = mentioned[0].id._serialized;
      const targetUser = getUser(db, target);
      user.dinero -= cant;
      targetUser.dinero += cant;
      addXP(db, from, 5);
      saveDB(db);
      await msg.reply(`🎁 Regalaste *$${fmt(cant)}* a @${mentioned[0].id.user}!\n💰 Tu saldo: $${fmt(user.dinero)}`);
    }

    // ────────────────── /ping ──────────────────
    else if (cmd === '/ping') {
      const start = Date.now();
      const sentMsg = await msg.reply('🏓 Pong!');
      const latency = Date.now() - start;
      await sentMsg.edit(`🏓 *NEKOSBOT ONLINE*\n⚡ Latencia: *${latency}ms*\n✅ Estado: Activo`);
    }

    // ────────────────── /uptime ──────────────────
    else if (cmd === '/uptime') {
      await msg.reply(`⏱️ *UPTIME NEKOSBOT*\n🟢 Activo hace: *${uptime()}*\n🤖 Estado: Online 24/7`);
    }

    // ══ COMANDOS OWNER ══

    // ────────────────── /play ──────────────────
    else if (cmd === '/play') {
      if (!isOwner) return msg.reply('🔒 Solo el owner puede usar este comando');
      if (!texto) return msg.reply('❌ Uso: /play [nombre de canción]');
      await msg.reply(`🔍 Buscando: *${texto}*...`);
      try {
        const url = `https://api.lem916.com/api/download/ytmp3?url=${encodeURIComponent(texto)}&apikey=${API_YT}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        if (data && (data.download_url || data.url || data.link)) {
          const link = data.download_url || data.url || data.link;
          const titulo = data.title || data.name || texto;
          await msg.reply(`🎵 *${titulo}*\n📥 Link: ${link}\n_NEKOSBOT GACHA_`);
        } else {
          await msg.reply(`⚠️ No se pudo obtener el audio.\nRespuesta: ${JSON.stringify(data).slice(0, 200)}`);
        }
      } catch (e) {
        await msg.reply(`❌ Error al descargar: ${e.message}`);
      }
    }

    // ────────────────── /yt ──────────────────
    else if (cmd === '/yt') {
      if (!isOwner) return msg.reply('🔒 Solo el owner puede usar este comando');
      if (!texto) return msg.reply('❌ Uso: /yt [nombre/url]');
      await msg.reply(`🔍 Buscando en YouTube: *${texto}*...`);
      try {
        const url = `https://api.lem916.com/api/download/ytmp3?url=${encodeURIComponent(texto)}&apikey=${API_YT}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        const titulo = data.title || data.name || 'Sin título';
        const duracion = data.duration || data.dur || 'N/A';
        const link = data.download_url || data.url || data.link || 'No disponible';
        await msg.reply(`🎬 *INFO YOUTUBE*\n\n📌 Título: ${titulo}\n⏱️ Duración: ${duracion}\n🔗 Descarga: ${link}`);
      } catch (e) {
        await msg.reply(`❌ Error: ${e.message}`);
      }
    }

    // ────────────────── /tt ──────────────────
    else if (cmd === '/tt') {
      if (!isOwner) return msg.reply('🔒 Solo el owner puede usar este comando');
      if (!texto) return msg.reply('❌ Uso: /tt [url de tiktok]');
      await msg.reply(`🔍 Procesando TikTok...`);
      try {
        const url = `https://api.lem916.com/api/download/tiktok?url=${encodeURIComponent(texto)}&apikey=${API_TT}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        const titulo = data.title || data.desc || 'Sin título';
        const link = data.download_url || data.url || data.video || 'No disponible';
        const autor = data.author || data.user || 'Desconocido';
        await msg.reply(`🎵 *INFO TIKTOK*\n\n👤 Autor: ${autor}\n📌 Descripción: ${titulo}\n🔗 Descarga: ${link}`);
      } catch (e) {
        await msg.reply(`❌ Error: ${e.message}`);
      }
    }

  } catch (err) {
    console.error('Error en comando:', cmd, err.message);
    logHistory(`ERROR [${cmd}] ${err.message}`);
    await msg.reply(`❌ Error interno: ${err.message}`).catch(() => {});
  }
});

// ──────────────── INICIAR ────────────────
client.initialize().catch(err => {
  console.error('Error al iniciar bot:', err);
  logHistory(`Error crítico: ${err.message}`);
});
