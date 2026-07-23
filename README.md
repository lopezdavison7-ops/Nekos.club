# 🎮 NEKOSBOT GACHA

Bot de WhatsApp con sistema Gacha completo, economía y juegos.  
Hecho para funcionar 24/7 en Render.

---

## 🚀 Despliegue en Render

| Campo | Valor |
|-------|-------|
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Runtime** | Node.js 18+ |

### Variables de Entorno en Render

| Variable | Valor |
|----------|-------|
| `OWNER`  | `50578391933@c.us` |
| `API_YT` | `lem916` |
| `API_TT` | `lem916` |

---

## 📱 Vincular WhatsApp

Al iniciar el bot por **primera vez**, en la consola de Render aparecerá:

```
╔══════════════════════════════════════╗
║  📱 CÓDIGO DE EMPAREJAMIENTO         ║
║  🔑 CÓDIGO: XXXX-XXXX               ║
║  📞 NÚMERO: 50578391933              ║
╚══════════════════════════════════════╝
```

1. Abre WhatsApp en tu celular
2. Ve a **Ajustes → Dispositivos vinculados → Vincular dispositivo**
3. Selecciona **"Vincular con número de teléfono"**
4. Ingresa el código de 8 dígitos que aparece en la consola

---

## 📋 Comandos

### 💰 Economía
| Comando | Descripción |
|---------|-------------|
| `/perfil` | Tu perfil gacha (dinero, banco, nivel, XP) |
| `/trabajar` | Ganar monedas (cooldown 1 min) |
| `/diario` | Recompensa diaria con streak |
| `/banco [cant]` | Depositar en banco |
| `/retirar [cant]` | Retirar del banco |
| `/transferir @user [cant]` | Enviar dinero |
| `/regalo @user [cant]` | Regalar dinero |

### 🗡️ Combate
| Comando | Descripción |
|---------|-------------|
| `/robar @user` | Robar 25% del dinero (60% éxito, cooldown 5 min) |
| `/duel @user [apuesta]` | Duelo PvP por dinero |

### 🎰 Casino
| Comando | Descripción |
|---------|-------------|
| `/ruleta [cant]` | Ruleta (cooldown 15s) |
| `/slots [cant]` | Tragamonedas |
| `/dado [cant]` | Tirar dados |
| `/moneda [cant] [cara/cruz]` | Cara o cruz |
| `/blackjack [cant]` | Blackjack |

### 🎴 Gacha
| Comando | Descripción |
|---------|-------------|
| `/playasmollete` | Giro gacha gratis (cooldown 30s) |
| `/tienda` | Ver items disponibles |
| `/comprar [id]` | Comprar item de la tienda |
| `/inventario` | Ver tus items |

### 🎣 Actividades
| Comando | Descripción |
|---------|-------------|
| `/pesca` | Pescar items (cooldown 90s) |
| `/cazar` | Cazar recursos (cooldown 120s) |
| `/trivia` | Trivia por dinero |
| `/responder [resp]` | Responder trivia activa |
| `/mision` | Ver/asignar misión diaria |

### 📊 Info
| Comando | Descripción |
|---------|-------------|
| `/menu` | Todos los comandos |
| `/ranklist` | Top 10 jugadores |
| `/ping` | Estado del bot |
| `/uptime` | Tiempo activo |

### 🎵 Media (solo Owner)
| Comando | Descripción |
|---------|-------------|
| `/play [cancion]` | Descargar MP3 de YouTube |
| `/yt [nombre/url]` | Info de YouTube |
| `/tt [url]` | Info de TikTok |

---

## 📁 Estructura de Archivos

```
Nekos.club/
├── index.js           # Bot principal
├── package.json       # Dependencias
├── .gitignore         # Archivos ignorados
├── database.json      # Base de datos JSON
├── .env.example       # Variables de entorno de ejemplo
├── documentos/
│   └── historial.txt  # Historial de comandos
└── README.md          # Este archivo
```

---

## ⚙️ Rareza del Gacha

| Rareza | Probabilidad | Bonus Coins |
|--------|-------------|-------------|
| ⬜ Común | 40% | +50 |
| ⬜ Común 2 | 30% | +60 |
| 🟦 Raro | 15% | +200 |
| 🟣 Épico | 10% | +500 |
| 🟡 Legendaria | 4% | +1500 |
| ✨ ULTRA | 1% | +5000 |

---

_NEKOSBOT GACHA v2.0 — by lopezdavison7-ops 🐾_
