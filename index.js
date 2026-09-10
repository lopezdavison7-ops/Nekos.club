const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const Boom = require('@hapi/boom');
const fs = require('fs');
const readline = require('readline');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Directorio donde se guardan las credenciales (sesión)
const AUTH_DIR = 'auth_info';

// ──────────────── MENÚ DE VINCULACIÓN ────────────────
async function pedirConfiguracion() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  return new Promise(resolve => {
    console.clear();
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  🐾 NEKOSBOT GACHA v3.0 - INICIO     ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('\n¿Cómo deseas vincular tu bot de WhatsApp?');
    console.log(' [1] Código de 8 dígitos (Recomendado)');
    console.log(' [2] Escanear Código QR');
    
    rl.question('\nSelecciona una opción (1 o 2): ', async (opcion) => {
      const op = opcion.trim();
      let config = { method: 'qr', phone: null };
      
      if (op === '1') {
        config.method = 'code';
        rl.question('\n📞 Ingresa tu número (con código de país, ej: 5215512345678):\n> ', (num) => {
          config.phone = num.trim().replace(/\D/g, '');
          rl.close();
          resolve(config);
        });
      } else {
        config.method = 'qr';
        console.log('\n📱 Preparando Código QR...');
        rl.close();
        resolve(config);
      }
    });
  });
}

// ══════════════════════════════════════════
//                  BOT PRINCIPAL
// ══════════════════════════════════════════
async function startBot() {
  const config = await pedirConfiguracion();

  console.log('\n⏳ Iniciando conexión WebSocket...\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // Lo controlamos manualmente para mejor visualización
    logger: pino({ level: 'silent' }),
    browser: ['NEKOSBOT GACHA', 'Chrome', '120.0.6099.109'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  let pairDone = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ═══════ LÓGICA DE VINCULACIÓN ═══════
    
    // Opción 2: Código QR
    if (config.method === 'qr' && qr && !pairDone) {
      pairDone = true;
      console.log('\n📷 Escanea este código QR desde WhatsApp > Dispositivos vinculados:\n');
      qrcode.generate(qr, { small: true });
    }

    // Opción 1: Código de 8 dígitos
    if (config.method === 'code' && qr && !pairDone) {
      pairDone = true;
      console.log('\n📡 Solicitando código de 8 dígitos a WhatsApp...');
      try {
        // Pequeño delay para asegurar que el socket esté estable
        await new Promise(r => setTimeout(r, 1500));
        const code = await sock.requestPairingCode(config.phone);
        const fmt8 = code?.match(/.{1,4}/g)?.join('-') || code;
        
        console.log('\n╔══════════════════════════════════════╗');
        console.log('║   🔑 TU CÓDIGO DE VINCULACIÓN        ║');
        console.log(`║          ➤  ${fmt8}  ◄               ║`);
        console.log('║                                      ║');
        console.log('║  Ve a WhatsApp > Configuración >     ║');
        console.log('║  Dispositivos vinculados >           ║');
        console.log('║  Vincular con número de teléfono     ║');
        console.log('╚══════════════════════════════════════╝\n');
      } catch (e) {
        console.log(`❌ Error al generar código: ${e?.message || e}`);
        console.log('💡 Tip: Asegúrate de incluir el prefijo de celular si aplica (ej. 521... en México)');
      }
    }

    // ═══════ MANEJO DE DESCONEXIONES ═══════
    if (connection === 'close') {
      const err = new Boom(lastDisconnect?.error);
      const reasonCode = err?.output?.statusCode;
      
      console.log(`\n🔴 Conexión cerrada. Código: ${reasonCode} (${err?.message || 'Desconocido'})`);

      // 🔒 PROTECCIÓN DE SESIÓN: 
      // Solo borramos la sesión si hay un error fatal (Logged Out 401 o Bad Session).
      // YA NO borra la sesión en errores 500 del servidor de WhatsApp.
      if (reasonCode === DisconnectReason.loggedOut || reasonCode === DisconnectReason.badSession || reasonCode === 401) {
        console.log('🗑️ Sesión inválida detectada. Borrando caché...');
        try { 
          fs.rmSync(AUTH_DIR, { recursive: true, force: true }); 
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        } catch(_){}
      }

      // 🔄 RECONEXIÓN SEGURA
      if (reasonCode !== DisconnectReason.connectionReplaced) {
        pairDone = false;
        console.log('🔄 Reconectando en 5 segundos...\n');
        setTimeout(startBot, 5000);
      } else {
        console.log('⚠️ La sesión fue abierta en otro dispositivo. Deteniendo bot.');
      }
    } 
    
    // ═══════ CONEXIÓN EXITOSA ═══════
    else if (connection === 'open') {
      console.log('✅ ¡NEKOSBOT GACHA conectado y activo!\n');
      pairDone = true; 
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ══════════════════════════════════════════════════════
  // 👇 AQUÍ VA EL RESTO DE TU CÓDIGO (HANDLERS, GACHA, ETC) 👇
  // ══════════════════════════════════════════════════════

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const m = messages[0];
    if (!m.message) return;
    
    // Tu lógica de comandos (gacha, economia, etc) debe ir aquí abajo...
    // const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
  });
}

// Iniciar el bot
startBot().catch(err => console.error('❌ Error fatal al iniciar:', err));