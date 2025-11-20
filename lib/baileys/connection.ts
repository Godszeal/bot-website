import type { Boom } from "@hapi/boom"
import pino from "pino"
import fs from "fs"
import path from "path"

// Store active connections in memory with keep-alive timers and pairing state tracking
const activeConnections = new Map<
  string,
  {
    sock: any
    keepAliveTimer?: NodeJS.Timeout
    pairingTimer?: NodeJS.Timeout
    isPairing: boolean
    pairingStartTime?: number
  }
>()

export interface BaileysConnectionOptions {
  botId: string
  phoneNumber: string
  onPairingCode?: (code: string) => void
  onQR?: (qr: string) => void
  onConnected?: (sessionData: any) => void
  onDisconnected?: (reason: string) => void
  channelJid?: string
}

export async function createBaileysConnection(options: BaileysConnectionOptions) {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
  } = await import("@whiskeysockets/baileys")

  const { botId, phoneNumber, onPairingCode, onQR, onConnected, onDisconnected, channelJid } = options

  const sessionDir = path.join("/tmp", "baileys_sessions", botId)

  // Create session directory if it doesn't exist
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
    console.log("[v0] 📁 Created session directory:", sessionDir)
  }

  const credsPath = path.join(sessionDir, "creds.json")
  if (fs.existsSync(credsPath)) {
    try {
      fs.unlinkSync(credsPath)
      console.log("[v0] 🧹 Cleaned up existing creds.json")
    } catch (err) {
      console.error("[v0] ❌ Error cleaning up creds:", err)
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const { version } = await fetchLatestBaileysVersion()

  console.log("[v0] 🚀 Creating WhatsApp socket for bot:", botId)
  console.log("[v0] 📱 Baileys version:", version)
  console.log("[v0] 🔐 Is already registered:", state.creds.registered)

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    generateHighQualityLinkPreview: true,
    connectTimeoutMs: 120000, // 2 minutes to establish connection
    defaultQueryTimeoutMs: 120000, // 2 minutes for queries
    keepAliveIntervalMs: 20000, // Send keep-alive every 20 seconds
    retryRequestDelayMs: 2000,
    markOnlineOnConnect: false,
  })

  const pairingStartTime = Date.now()
  activeConnections.set(botId, {
    sock,
    isPairing: !sock.authState.creds.registered,
    pairingStartTime,
  })

  const keepAliveTimer = setInterval(() => {
    const connData = activeConnections.get(botId)
    if (connData) {
      const elapsedTime = Date.now() - (connData.pairingStartTime || 0)

      if (connData.isPairing && elapsedTime < 120000) {
        // During 2-minute pairing window
        console.log("[v0] ⏰ Pairing window active:", Math.floor((120000 - elapsedTime) / 1000), "seconds remaining")

        // Send presence update to keep connection alive
        sock.sendPresenceUpdate("available").catch((err: any) => {
          console.log("[v0] Keep-alive ping sent (connection may not be open yet)")
        })
      } else if (sock.user) {
        // After pairing, normal keep-alive
        console.log("[v0] 💓 Sending keep-alive ping for bot:", botId)
        sock.sendPresenceUpdate("available").catch((err: any) => {
          console.error("[v0] ❌ Keep-alive error:", err)
        })
      }
    }
  }, 15000) // Every 15 seconds

  activeConnections.set(botId, {
    ...activeConnections.get(botId)!,
    keepAliveTimer,
  })

  if (!sock.authState.creds.registered) {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "")
    console.log("[v0] 📞 Phone number for pairing:", cleanNumber)

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      const error = new Error("Invalid phone number. Must be between 10-15 digits including country code.")
      console.error("[v0] ❌", error.message)
      throw error
    }

    try {
      console.log("[v0] 🔑 Requesting pairing code for number:", cleanNumber)
      await delay(1000)

      const code = await sock.requestPairingCode(cleanNumber)

      if (!code) {
        throw new Error("Pairing code returned empty")
      }

      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code
      console.log("[v0] ✅ Pairing code generated:", formattedCode)
      console.log("[v0] ⏰ You have 2 minutes to enter this code in WhatsApp")

      if (onPairingCode) {
        await onPairingCode(formattedCode)
      }

      const pairingTimer = setTimeout(() => {
        const connData = activeConnections.get(botId)
        if (connData?.isPairing) {
          console.log("[v0] ⏰ 2-minute pairing window expired, checking connection...")

          // Check if pairing completed
          if (!sock.user) {
            console.log("[v0] 🔄 Pairing not completed, will auto-reconnect...")
            // Connection will auto-reconnect via connection.update handler
          }
        }
      }, 120000) // 2 minutes

      activeConnections.set(botId, {
        ...activeConnections.get(botId)!,
        pairingTimer,
      })
    } catch (error) {
      console.error("[v0] ❌ Error generating pairing code:", error)
      throw new Error(`Failed to generate pairing code: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update

    console.log("[v0] 🔄 Connection update:", { connection, hasQR: !!qr })

    if (qr && onQR) {
      console.log("[v0] 📱 QR code generated")
      onQR(qr)
    }

    if (connection === "open") {
      console.log("[v0] ✅ WhatsApp connection opened for bot:", botId)

      const connData = activeConnections.get(botId)
      if (connData) {
        connData.isPairing = false
        if (connData.pairingTimer) {
          clearTimeout(connData.pairingTimer)
        }
      }

      try {
        const credsPath = path.join(sessionDir, "creds.json")
        let sessionData: any = {}

        if (fs.existsSync(credsPath)) {
          const credsContent = fs.readFileSync(credsPath, "utf-8")
          sessionData = JSON.parse(credsContent)
          console.log("[v0] 💾 Session data loaded successfully")
        }

        await delay(3000)

        try {
          const welcomeMsg = `✅ *Connection Successful!*\n\n📱 *Phone Number:* ${phoneNumber}\n🤖 *Bot:* God's Zeal Xmd\n⏰ *Connected:* ${new Date().toLocaleString()}\n\n🎉 Your WhatsApp bot is now active and ready to use!\n\nThank you for using God's Zeal Xmd! 🚀`

          await sock.sendMessage(sock.user!.id, {
            text: welcomeMsg,
          })
          console.log("[v0] ✅ Welcome message sent successfully to user's DM")
        } catch (msgError) {
          console.error("[v0] ❌ Error sending welcome message:", msgError)
        }

        if (channelJid) {
          try {
            await delay(2000)
            await sock.newsletterFollow(channelJid)
            console.log("[v0] ✅ Auto-followed WhatsApp channel:", channelJid)
          } catch (channelError) {
            console.error("[v0] ❌ Error following channel:", channelError)
          }
        }

        onConnected?.({
          creds: sessionData,
          sessionDir,
        })
      } catch (error) {
        console.error("[v0] ❌ Error processing connection:", error)
      }
    }

    if (connection === "close") {
      const connData = activeConnections.get(botId)
      if (connData?.keepAliveTimer) {
        clearInterval(connData.keepAliveTimer)
      }
      if (connData?.pairingTimer) {
        clearTimeout(connData.pairingTimer)
      }

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.log("[v0] 🔌 Connection closed. Status code:", statusCode, "Reconnect:", shouldReconnect)

      if (shouldReconnect && connData?.isPairing) {
        const elapsedTime = Date.now() - (connData.pairingStartTime || 0)

        if (elapsedTime < 120000) {
          // Still within 2-minute pairing window
          console.log(
            "[v0] 🔄 Auto-reconnecting during pairing window (",
            Math.floor((120000 - elapsedTime) / 1000),
            "seconds left)...",
          )
          setTimeout(() => createBaileysConnection(options), 3000)
        } else {
          console.log("[v0] ⏰ Pairing window expired")
          activeConnections.delete(botId)
          onDisconnected?.("Pairing timeout")
        }
      } else if (shouldReconnect && sock.user) {
        // Reconnect if already paired
        console.log("[v0] 🔄 Reconnecting in 5 seconds...")
        setTimeout(() => createBaileysConnection(options), 5000)
      } else {
        activeConnections.delete(botId)
        onDisconnected?.(statusCode === DisconnectReason.loggedOut ? "Logged out" : "Connection closed")
      }
    }
  })

  sock.ev.on("creds.update", async () => {
    console.log("[v0] 💾 Credentials updated, saving...")
    await saveCreds()
  })

  return sock
}

export function getActiveConnection(botId: string) {
  return activeConnections.get(botId)?.sock
}

export function closeConnection(botId: string) {
  const connData = activeConnections.get(botId)
  if (connData) {
    if (connData.keepAliveTimer) {
      clearInterval(connData.keepAliveTimer)
    }
    if (connData.pairingTimer) {
      clearTimeout(connData.pairingTimer)
    }
    connData.sock.end()
    activeConnections.delete(botId)
  }
}

export function cleanupSession(botId: string) {
  const sessionDir = path.join("/tmp", "baileys_sessions", botId)
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
  }
}
