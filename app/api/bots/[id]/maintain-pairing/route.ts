import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { sendRepositoryNotification } from "@/lib/baileys/connection"

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function forkAndDeployAsync(botId: string, userId: string, phoneNumber: string, sessionData: any, supabase: any) {
  try {
    const { data: userData } = await supabase.from("users").select("github_token").eq("id", userId).single()
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["main_bot_repo_url", "github_token"])

    const mainRepoUrl = settings?.find((s: any) => s.setting_key === "main_bot_repo_url")?.setting_value
    const adminToken = settings?.find((s: any) => s.setting_key === "github_token")?.setting_value

    if (!mainRepoUrl) throw new Error("Main bot repository URL not configured")

    const [repoOwner, repoName] = mainRepoUrl.split("/").slice(-2)
    const octokit = (await import("@octokit/rest")).Octokit
    const githubToken = userData?.github_token || adminToken

    if (!githubToken) throw new Error("GitHub token not available")

    const client = new octokit({ auth: githubToken })

    let fork = null
    const { data: existingForks } = await client.repos.listForks({
      owner: repoOwner,
      repo: repoName,
    })

    const userFork = existingForks?.find((f: any) => f.owner.login === userData?.github_username)
    if (userFork) {
      fork = userFork
      console.log("[v0] Found existing fork:", fork.full_name)
    } else {
      const { data: newFork } = await client.repos.createFork({
        owner: repoOwner,
        repo: repoName,
      })
      fork = newFork
      await new Promise((resolve) => setTimeout(resolve, 8000))
    }

    const credsContent = JSON.stringify(sessionData.creds, null, 2)

    let credsSha: string | undefined
    try {
      const { data: existingCreds } = await client.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: "session/creds.json",
      })
      if ("sha" in existingCreds) {
        credsSha = existingCreds.sha
      }
    } catch (error) {
      console.log("[v0] No existing creds.json found")
    }

    await client.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: "session/creds.json",
      message: "Add WhatsApp session credentials",
      content: Buffer.from(credsContent).toString("base64"),
      ...(credsSha && { sha: credsSha }),
    })

    const workflowContent = `name: Deploy WhatsApp Bot

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start bot
        run: npm start
        env:
          NODE_ENV: production
`

    let workflowSha: string | undefined
    try {
      const { data: existingWorkflow } = await client.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: ".github/workflows/deploy.yml",
      })
      if ("sha" in existingWorkflow) {
        workflowSha = existingWorkflow.sha
      }
    } catch (error) {
      console.log("[v0] No existing workflow found")
    }

    await client.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: ".github/workflows/deploy.yml",
      message: "Add deployment workflow",
      content: Buffer.from(workflowContent).toString("base64"),
      ...(workflowSha && { sha: workflowSha }),
    })

    await supabase
      .from("bots")
      .update({
        github_repo_url: fork.html_url,
        github_repo_name: fork.full_name,
        github_branch: fork.default_branch,
        status: "deployed",
        last_deployed_at: new Date().toISOString(),
      })
      .eq("id", botId)

    console.log("[v0] Bot deployed successfully:", fork.html_url)
    await sendRepositoryNotification(botId, phoneNumber, fork.html_url)
  } catch (error) {
    console.error("[v0] Error in fork and deploy:", error)
    await supabase
      .from("bots")
      .update({ status: "error" })
      .eq("id", botId)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
            
            // Start fork and deploy after successful pairing
            console.log("[v0] 🚀 Starting fork and deploy after successful pairing")
            forkAndDeployAsync(id, user.id, bot.phone_number, sessionData, supabase).catch((error) => {
              console.error("[v0] ❌ Error in fork and deploy:", error)
            })
            
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
