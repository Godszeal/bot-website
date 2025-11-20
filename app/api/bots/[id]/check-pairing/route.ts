import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import {
  makeWASocket,
  useMultiFileAuthState as loadAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from "@whiskeysockets/baileys"
import pino from "pino"

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

    if (bot.status !== "pairing") {
      return NextResponse.json({
        isPaired: bot.status === "active",
        status: bot.status,
      })
    }

    console.log("[v0] 🔍 Checking pairing status for bot:", id)

    const sessionDir = path.join("/tmp", "baileys_sessions", id)

    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({
        isPaired: false,
        message: "Session not found, still waiting for pairing",
      })
    }

    const { state, saveCreds } = await loadAuthState(sessionDir)

    if (state.creds.registered && state.creds.me) {
      console.log("[v0] ✅ Found registered credentials!")

      const credsPath = path.join(sessionDir, "creds.json")
      let sessionData: any = {}

      if (fs.existsSync(credsPath)) {
        const credsContent = fs.readFileSync(credsPath, "utf-8")
        sessionData = JSON.parse(credsContent)
        console.log("[v0] 💾 Session data loaded")
      }

      const { data: settings } = await supabase.from("admin_settings").select("*").limit(1).single()

      const { error: updateError } = await supabase
        .from("bots")
        .update({
          status: "active",
          is_connected: true,
          connected_at: new Date().toISOString(),
          session_data: sessionData,
        })
        .eq("id", id)

      if (updateError) {
        console.error("[v0] ❌ Error updating bot:", updateError)
      } else {
        console.log("[v0] ✅ Bot marked as active")
      }

      const { version } = await fetchLatestBaileysVersion()
      const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu("Chrome"),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 30000,
      })

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 25000)

        sock.ev.on("connection.update", async (update) => {
          const { connection } = update

          if (connection === "open") {
            clearTimeout(timeout)
            console.log("[v0] ✅ Connection opened for welcome message")

            try {
              const welcomeMsg = `✅ *Connection Successful!*\n\n📱 *Phone Number:* ${bot.phone_number}\n🤖 *Bot:* God's Zeal Xmd\n⏰ *Connected:* ${new Date().toLocaleString()}\n\n🎉 Your WhatsApp bot is now active and ready to use!\n\nThank you for using God's Zeal Xmd! 🚀`

              await sock.sendMessage(sock.user!.id, {
                text: welcomeMsg,
              })
              console.log("[v0] ✅ Welcome message sent")

              if (settings?.whatsapp_channel_jid) {
                try {
                  await sock.newsletterFollow(settings.whatsapp_channel_jid)
                  console.log("[v0] ✅ Auto-followed WhatsApp channel")
                } catch (channelError) {
                  console.error("[v0] ❌ Error following channel:", channelError)
                }
              }
            } catch (msgError) {
              console.error("[v0] ❌ Error sending messages:", msgError)
            }

            sock.end()
            resolve(true)
          } else if (connection === "close") {
            clearTimeout(timeout)
            resolve(false)
          }
        })
      })

      if (settings?.github_token && settings?.main_bot_repository) {
        console.log("[v0] 🚀 Triggering GitHub deployment...")

        const { data: userData } = await supabase.from("users").select("github_token").eq("id", user.id).single()

        const githubToken = userData?.github_token || settings.github_token
      }

      return NextResponse.json({
        isPaired: true,
        status: "active",
        message: "Pairing completed successfully!",
      })
    }

    console.log("[v0] ⏳ Still waiting for pairing...")
    return NextResponse.json({
      isPaired: false,
      message: "Still waiting for pairing",
    })
  } catch (error) {
    console.error("[v0] ❌ Error checking pairing:", error)
    return NextResponse.json({
      isPaired: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
