import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    console.log("[v0] 🔄 Maintaining pairing connection for bot:", id)

    const sessionDir = path.join("/tmp", "baileys_sessions", id)

    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const {
      default: makeWASocket,
      useMultiFileAuthState: loadAuthState,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      Browsers,
      DisconnectReason,
      delay,
    } = await import("@whiskeysockets/baileys")
    const pino = (await import("pino")).default

    const { state, saveCreds } = await loadAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    console.log("[v0] 🚀 Creating socket to maintain pairing connection")
    console.log("[v0] 📱 Registered:", state.creds.registered)

    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      retryRequestDelayMs: 1000,
    })

    let isPaired = false
    let connectionOpen = false

    sock.ev.on("creds.update", saveCreds)

    const pairingPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[v0] ⏰ Pairing maintenance timeout (60s)")
        resolve(false)
      }, 55000)

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update

        console.log("[v0] 🔄 Connection update:", connection)

        if (connection === "open") {
          connectionOpen = true
          console.log("[v0] ✅ Connection opened! Device linked successfully")

          clearTimeout(timeout)

          try {
            const credsPath = path.join(sessionDir, "creds.json")
            let sessionData: any = {}

            if (fs.existsSync(credsPath)) {
              const credsContent = fs.readFileSync(credsPath, "utf-8")
              sessionData = JSON.parse(credsContent)
            }

            const { data: settings } = await supabase.from("admin_settings").select("*").limit(1).single()

            await supabase
              .from("bots")
              .update({
                status: "active",
                is_connected: true,
                connected_at: new Date().toISOString(),
                session_data: sessionData,
              })
              .eq("id", id)

            console.log("[v0] ✅ Bot marked as active in database")

            await delay(2000)

            const welcomeMsg = `✅ *Connection Successful!*\n\n📱 *Phone Number:* ${bot.phone_number}\n🤖 *Bot:* God's Zeal Xmd\n⏰ *Connected:* ${new Date().toLocaleString()}\n\n🎉 Your WhatsApp bot is now active and ready to use!\n\nThank you for using God's Zeal Xmd! 🚀`

            await sock.sendMessage(sock.user!.id, {
              text: welcomeMsg,
            })
            console.log("[v0] ✅ Welcome message sent")

            if (settings?.whatsapp_channel_jid) {
              try {
                await delay(1000)
                await sock.newsletterFollow(settings.whatsapp_channel_jid)
                console.log("[v0] ✅ Auto-followed WhatsApp channel")
              } catch (channelError) {
                console.error("[v0] ❌ Channel follow error:", channelError)
              }
            }

            isPaired = true
            resolve(true)
          } catch (error) {
            console.error("[v0] ❌ Error processing pairing:", error)
            resolve(false)
          }
        } else if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          console.log("[v0] 🔌 Connection closed, status:", statusCode)

          if (statusCode === DisconnectReason.loggedOut || isPaired) {
            clearTimeout(timeout)
            resolve(isPaired)
          }
          // If not logged out and not paired, keep connection alive (will auto-reconnect)
        }
      })

      const keepAliveInterval = setInterval(() => {
        if (connectionOpen && !isPaired) {
          sock
            .sendPresenceUpdate("available")
            .then(() => console.log("[v0] 💓 Keep-alive sent"))
            .catch(() => console.log("[v0] ⚠️ Keep-alive failed (connection may be closed)"))
        }
      }, 10000)

      // Clean up interval when done
      setTimeout(() => clearInterval(keepAliveInterval), 56000)
    })

    const success = await pairingPromise

    sock.end()

    return NextResponse.json({
      success,
      isPaired: success,
      message: success ? "Device paired successfully!" : "Pairing timeout - please try again",
    })
  } catch (error) {
    console.error("[v0] ❌ Error maintaining pairing:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
