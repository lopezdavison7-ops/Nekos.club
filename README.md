# 🐾 NEKOSBOT GACHA v3.0

Bot de WhatsApp con sistema Gacha completo, powered by **Baileys** (sin Puppeteer, sin Chrome).

## ✨ Características
- 🔑 Vinculación por **código de 8 dígitos** (sin QR)
- ⚡ Sin Puppeteer — puro WebSocket
- 🎮 +20 comandos: Gacha, Casino, Economía, Duelos, Pesca, Trivia...
- 🔄 Reconexión automática
- 🌐 Compatible con **Render** (servidor HTTP integrado)

---

## 🚀 Deploy en Render

1. Fork/push este repo a tu GitHub
2. En [Render](https://render.com) → **New Web Service** → conecta tu repo
3. Configuración:
   - **Root Directory:** `nekosbot`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. **Environment Variables:**
   - `PHONE_NUMBER` = tu número con código de país (ej: `525548289402`)
   - `OWNER` = tu número para comandos de owner
5. **Disk** (para que la sesión persista):
   - Mount Path: `/opt/render/project/src/nekosbot/auth_info`
   - Size: 1 GB
6. Deploy → espera los logs → copia el **código de 8 dígitos**
7. En WhatsApp → Configuración → Dispositivos vinculados → Vincular con número → ingresa el código

---

## 🖥️ Correr localmente

```bash
cd nekosbot
npm install
node index.js
```

Configura la variable de entorno o ingresa el número cuando lo pida.

---

## 📋 Comandos

| Comando | Descripción |
|---------|-------------|
| `/menu` | Lista completa de comandos |
| `/perfil` | Tu perfil y estadísticas |
| `/trabajar` | Ganar monedas (CD: 1 min) |
| `/diario` | Recompensa diaria |
| `/banco`, `/retirar` | Gestión bancaria |
| `/transferir @user cant` | Transferir dinero |
| `/robar @user` | Intentar robar (CD: 5 min) |
| `/duel @user apuesta` | Duelo 1v1 |
| `/ruleta cant` | Ruleta |
| `/slots cant` | Tragamonedas |
| `/dado cant` | Dados |
| `/moneda cant cara\|cruz` | Cara o cruz |
| `/blackjack cant` | Blackjack |
| `/playasmollete` | Giro Gacha gratuito |
| `/tienda` | Ver tienda |
| `/comprar id` | Comprar item |
| `/inventario` | Ver inventario |
| `/pesca` | Pescar (CD: 90s) |
| `/cazar` | Cazar (CD: 120s) |
| `/trivia` | Pregunta trivia |
| `/mision` | Misión diaria |
| `/ranklist` | Top jugadores |
| `/ping` | Estado del bot |
| `/uptime` | Tiempo activo |
| `/play cancion` | *(Owner)* MP3 YouTube |
| `/yt url` | *(Owner)* Info YouTube |
| `/tt url` | *(Owner)* Info TikTok |

---

## ⚙️ Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PHONE_NUMBER` | Número a vincular (con código país) | *se pregunta al inicio* |
| `OWNER` | Número del dueño del bot | `50578391933` |
| `PORT` | Puerto HTTP (Render lo asigna solo) | `3000` |
| `
---

*by lopezdavison7-ops — NEKOSBOT GACHA v3.0*
