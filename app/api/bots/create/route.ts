import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for Vercel Pro

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, phoneNumber } = body

    if (!name || !phoneNumber) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 })
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "")
    console.log("[Bot Create] Creating bot with phone:", cleanNumber)

    if (cleanNumber.length < 10) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    // Create bot in database first
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .insert({
        user_id: user.id,
        name,
        description,
        phone_number: phoneNumber,
        status: "pairing",
      })
      .select()
      .single()

    if (botError) {
      console.error("[Bot Create] Error creating bot:", botError)
      return NextResponse.json({ error: "Failed to create bot" }, { status: 500 })
    }

    console.log("[Bot Create] Bot created in database:", bot.id)

    // Start pairing process in background
    startPairingProcess(bot.id, cleanNumber, user.id, supabase)

    // Return immediately with bot info
    return NextResponse.json({
      bot: {
        ...bot,
        status: "pairing",
        message: "Pairing code will be generated in a few seconds. Please wait...",
      },
    })
  } catch (error) {
    console.error("[Bot Create] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function startPairingProcess(botId: string, phoneNumber: string, userId: string, supabase: any) {
  try {
    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      Browsers,
      delay,
    } = await import("@whiskeysockets/baileys")
    const pino = (await import("pino")).default
    const path = (await import("path")).default
    const fs = (await import("fs")).default

    const sessionDir = path.join(process.cwd(), "baileys_sessions", botId)

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    console.log("[Pairing] Creating socket for bot:", botId)

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
      keepAliveIntervalMs: 30000,
    })

    // Generate pairing code
    await delay(2000)

    if (!sock.authState.creds.registered) {
      console.log("[Pairing] Requesting pairing code for:", phoneNumber)
      
      const code = await sock.requestPairingCode(phoneNumber)
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code

      console.log("[Pairing] Code generated:", formattedCode)

      // Save pairing code to database
      await supabase.from("bots").update({
        pairing_code: formattedCode,
        status: "pairing",
      }).eq("id", botId)
    }

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update

      if (connection === "open") {
        console.log("[Pairing] Connection opened for bot:", botId)

        const credsPath = path.join(sessionDir, "creds.json")
        let sessionData: any = {}

        if (fs.existsSync(credsPath)) {
          const credsContent = fs.readFileSync(credsPath, "utf-8")
          sessionData = JSON.parse(credsContent)
        }

        await supabase.from("bots").update({
          status: "active",
          is_connected: true,
          connected_at: new Date().toISOString(),
          session_data: JSON.stringify(sessionData),
        }).eq("id", botId)

        // Send welcome message
        await delay(2000)
        try {
          const welcomeMsg = `✅ *Connection Successful!*\n\n📱 *Phone Number:* ${phoneNumber}\n🤖 *Bot:* God's Zeal Xmd\n⏰ *Connected:* ${new Date().toLocaleString()}\n\n🎉 Your WhatsApp bot is now active!\n\nThank you for using God's Zeal Xmd! 🚀`
          
          await sock.sendMessage(sock.user!.id, { text: welcomeMsg })
        } catch (err) {
          console.error("[Pairing] Error sending welcome message:", err)
        }

        // Deploy to GitHub
        await deployToGitHub(botId, userId, sessionData, supabase)
        
        sock.end()
      } else if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        console.log("[Pairing] Connection closed:", statusCode)

        if (statusCode !== DisconnectReason.loggedOut) {
          // Keep session alive for pairing
          setTimeout(() => startPairingProcess(botId, phoneNumber, userId, supabase), 3000)
        }
      }
    })

    sock.ev.on("creds.update", saveCreds)

  } catch (error) {
    console.error("[Pairing] Error:", error)
    await supabase.from("bots").update({
      status: "error",
    }).eq("id", botId)
  }
}

async function deployToGitHub(botId: string, userId: string, sessionData: any, supabase: any) {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["main_bot_repo_url", "github_token"])

    const settingsMap = settings?.reduce((acc: any, s: any) => {
      acc[s.setting_key] = s.setting_value
      return acc
    }, {})

    const mainRepoUrl = settingsMap?.main_bot_repo_url || "https://github.com/AiOfLautech/God-s-Zeal-Xmd"
    const repoMatch = mainRepoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    
    if (!repoMatch) {
      throw new Error("Invalid repository URL")
    }

    const [, repoOwner, repoName] = repoMatch
    const githubToken = settingsMap?.github_token

    if (!githubToken) {
      console.log("[Deploy] No GitHub token available, skipping deployment")
      return
    }

    const octokit = new Octokit({ auth: githubToken })

    console.log("[Deploy] Forking repository:", repoOwner, repoName)
    const { data: fork } = await octokit.repos.createFork({
      owner: repoOwner,
      repo: repoName,
    })

    await new Promise((resolve) => setTimeout(resolve, 8000))

    // Upload session
    const credsContent = JSON.stringify(sessionData, null, 2)
    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: "session/creds.json",
      message: "Add WhatsApp session credentials",
      content: Buffer.from(credsContent).toString("base64"),
    })

    console.log("[Deploy] Session uploaded successfully")

    // Update bot
    await supabase.from("bots").update({
      github_repo_url: fork.html_url,
      github_repo_name: fork.full_name,
      github_branch: fork.default_branch,
      status: "deployed",
      last_deployed_at: new Date().toISOString(),
    }).eq("id", botId)

  } catch (error) {
    console.error("[Deploy] Error:", error)
  }
}
