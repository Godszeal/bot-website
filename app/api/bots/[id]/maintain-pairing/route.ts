import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { sendRepositoryNotification } from "@/lib/baileys/connection"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

async function ensureRepositoryFiles(fork: any, client: any, sessionData: any, phoneNumber: string, botId: string, supabase: any, sock: any) {
  try {
    console.log("[v0] 🔍 Checking if repository files exist...")
    
    // Send status update via WhatsApp
    try {
      await sock.sendMessage(sock.user!.id, {
        text: `📦 *Creating Repository Files...*\n\n🔄 Setting up your GitHub repository with bot credentials and deployment workflow.\n\nPlease wait...`,
      })
    } catch (e) {
      console.log("[v0] ⚠️ Could not send repository status message")
    }
    
    // Check if creds.json exists
    let credsExists = false
    let credsSha: string | undefined
    try {
      const { data: existingCreds } = await client.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: "session/creds.json",
      })
      if ("sha" in existingCreds) {
        credsExists = true
        credsSha = existingCreds.sha
        console.log("[v0] ✅ creds.json already exists")
      }
    } catch (error) {
      console.log("[v0] ⚠️ creds.json not found, will create it")
    }

    // Check if workflow exists
    let workflowExists = false
    let workflowSha: string | undefined
    try {
      const { data: existingWorkflow } = await client.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: ".github/workflows/deploy.yml",
      })
      if ("sha" in existingWorkflow) {
        workflowExists = true
        workflowSha = existingWorkflow.sha
        console.log("[v0] ✅ Workflow already exists")
      }
    } catch (error) {
      console.log("[v0] ⚠️ Workflow not found, will create it")
    }

    // If both files exist, no need to do anything
    if (credsExists && workflowExists) {
      console.log("[v0] ✅ All repository files present")
      return
    }

    console.log("[v0] 🔄 Recreating missing repository files...")

    // Recreate creds.json if missing
    if (!credsExists) {
      const credsContent = JSON.stringify(sessionData.creds || sessionData, null, 2)
      await client.repos.createOrUpdateFileContents({
        owner: fork.owner.login,
        repo: fork.name,
        path: "session/creds.json",
        message: "Regenerate WhatsApp session credentials",
        content: Buffer.from(credsContent).toString("base64"),
      })
      console.log("[v0] ✅ creds.json recreated")
    }

    // Recreate workflow if missing
    if (!workflowExists) {
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
      await client.repos.createOrUpdateFileContents({
        owner: fork.owner.login,
        repo: fork.name,
        path: ".github/workflows/deploy.yml",
        message: "Regenerate deployment workflow",
        content: Buffer.from(workflowContent).toString("base64"),
      })
      console.log("[v0] ✅ Workflow recreated")
    }

    console.log("[v0] ✅ Repository files regenerated successfully")
  } catch (error) {
    console.error("[v0] ❌ Error ensuring repository files:", error)
    throw error
  }
}

async function forkAndDeployAsync(botId: string, userId: string, phoneNumber: string, sessionData: any, supabase: any, sock: any) {
  try {
    console.log("[v0] 🚀 Starting fork and deploy process...")
    
    // Send deployment started message
    try {
      await delay(2000) // Wait before sending
      await sock.sendMessage(sock.user!.id, {
        text: `🚀 *Deployment Started*\n\n⚡ Creating your GitHub repository and setting up deployment...\n\nThis may take a moment...`,
      })
      console.log("[v0] ✅ Deployment started message sent")
    } catch (e) {
      console.log("[v0] ⚠️ Could not send deployment started message:", e)
    }

    const { data: userData } = await supabase.from("users").select("github_token, github_username").eq("id", userId).single()
    
    if (!userData) {
      throw new Error("User not found")
    }

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["main_bot_repo", "main_bot_repo_owner", "main_bot_repo_name", "github_token"])

    const mainRepoOwner = settings?.find((s: any) => s.setting_key === "main_bot_repo_owner")?.setting_value
    const mainRepoName = settings?.find((s: any) => s.setting_key === "main_bot_repo_name")?.setting_value
    const adminToken = settings?.find((s: any) => s.setting_key === "github_token")?.setting_value

    if (!mainRepoOwner || !mainRepoName) {
      throw new Error("Main bot repository not configured in admin settings. Please set main_bot_repo_owner and main_bot_repo_name")
    }

    const mainRepoUrl = `${mainRepoOwner}/${mainRepoName}`

    const repoOwner = mainRepoOwner
    const repoName = mainRepoName
    const octokit = (await import("@octokit/rest")).Octokit
    
    // Determine which token to use
    const usingUserToken = !!userData?.github_token
    const githubToken = userData?.github_token || adminToken

    if (!githubToken) {
      throw new Error("GitHub token not available. Admin must set GITHUB_TOKEN in admin settings or you need to login with GitHub")
    }

    const tokenSource = usingUserToken ? "user's GitHub account" : "admin's GitHub account"
    console.log(`[v0] 📦 Using token from ${tokenSource}`)
    console.log("[v0] 📦 Forking repository:", mainRepoUrl)
    const client = new octokit({ auth: githubToken })

    let fork = null
    
    // Try to find existing fork if user has GitHub username
    if (userData?.github_username) {
      console.log(`[v0] 🔍 Looking for existing fork owned by ${userData.github_username}...`)
      try {
        const { data: existingForks } = await client.repos.listForks({
          owner: repoOwner,
          repo: repoName,
        })

        const userFork = existingForks?.find((f: any) => f.owner.login === userData.github_username)
        if (userFork) {
          fork = userFork
          console.log("[v0] ✅ Found existing fork:", fork.full_name)
        }
      } catch (error) {
        console.log("[v0] ⚠️ Could not search for existing forks, will create new one")
      }
    } else {
      console.log("[v0] ℹ️ User has not logged in with GitHub, will create fork under token owner's account")
    }

    // Create new fork if we don't have one
    if (!fork) {
      console.log("[v0] 🍴 Creating new fork...")
      try {
        const { data: newFork } = await client.repos.createFork({
          owner: repoOwner,
          repo: repoName,
        })
        fork = newFork
        console.log("[v0] ✅ Fork created successfully")
        console.log("[v0] ⏳ Waiting for GitHub to sync fork...")
        await new Promise((resolve) => setTimeout(resolve, 8000))
      } catch (error) {
        if ((error as any).status === 422 && (error as any).message?.includes("already exists")) {
          console.log("[v0] ℹ️ Fork already exists, fetching it...")
          try {
            const { data: existingForks } = await client.repos.listForks({
              owner: repoOwner,
              repo: repoName,
            })
            // Get the most recent fork from the token owner
            const ownerLogin = githubToken === adminToken ? "admin" : userData?.github_username
            fork = existingForks?.[0] // Just use the first one if we can't determine exact owner
            if (!fork) {
              throw new Error("Could not find the forked repository")
            }
            console.log("[v0] ✅ Using existing fork:", fork.full_name)
          } catch (e) {
            throw new Error("Fork already exists but could not be accessed")
          }
        } else {
          throw error
        }
      }
    }

    if (!fork) {
      throw new Error("Failed to create or find fork")
    }

    // Give user access to repository if they have GitHub account
    let accessMessage = ""
    if (userData?.github_username && !usingUserToken) {
      // User doesn't have their own GitHub token, so fork is under admin's account
      // Add them as a collaborator so they can access and manage it
      try {
        console.log(`[v0] 👤 Adding ${userData.github_username} as collaborator to fork...`)
        await client.repos.addCollaborator({
          owner: fork.owner.login,
          repo: fork.name,
          username: userData.github_username,
          permission: "maintain", // Give them maintain access (can push, but not delete repo)
        })
        console.log(`[v0] ✅ ${userData.github_username} added as collaborator`)
        accessMessage = `\n\n👤 *Repository Access:* You've been added as a collaborator with full editing rights!`
      } catch (error) {
        console.log("[v0] ⚠️ Could not add user as collaborator:", error)
        accessMessage = `\n\n👤 *Repository Access:* Contact the admin for access to your repository`
      }
    } else if (!userData?.github_username) {
      // User has no GitHub account
      accessMessage = `\n\n👤 *Repository Access:* Ask the admin to grant you access to your repository at: ${fork.html_url}`
    }

    // Ensure repository files exist and create/update them if missing
    console.log("[v0] 🔍 Checking and creating repository files...")
    await ensureRepositoryFiles(fork, client, sessionData, phoneNumber, botId, supabase, sock)

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
    
    // Send deployment success message
    try {
      const repoMsg = `✅ *Deployment Successful!*\n\n🎉 Your WhatsApp bot is now deployed!\n\n📦 *Repository:* ${fork.html_url}\n🔗 *Status:* Active\n⏰ *Deployed:* ${new Date().toLocaleString()}${accessMessage}\n\nYour bot is ready to receive and send messages!\n\nView your code: ${fork.html_url}`
      await sock.sendMessage(sock.user!.id, {
        text: repoMsg,
      })
      console.log("[v0] ✅ Deployment success message sent")
    } catch (e) {
      console.log("[v0] ⚠️ Could not send deployment success message")
    }

    // Send repository notification
    await sendRepositoryNotification(botId, phoneNumber, fork.html_url)
    
    console.log("[v0] ✅ Fork and deploy process completed successfully")
  } catch (error) {
    console.error("[v0] ❌ Error in fork and deploy:", error)
    
    // Log the error details
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    
    // Send error message to user
    try {
      await sock.sendMessage(sock.user!.id, {
        text: `❌ *Deployment Error*\n\nThere was an issue deploying your bot:\n\n${error instanceof Error ? error.message : "Unknown error"}\n\nPlease check your GitHub settings and try again.`,
      })
    } catch (e) {
      console.log("[v0] ⚠️ Could not send error message")
    }

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

        if (connection === "connecting") {
          console.log("[v0] 🔗 Connecting to WhatsApp...")
          try {
            await sock.sendMessage(sock.user!.id, {
              text: `🔗 *Connecting...*\n\nEstablishing connection to WhatsApp\n\n⏳ Please wait...`,
            }).catch(() => {})
          } catch (e) {
            console.log("[v0] ⚠️ Could not send connecting message")
          }
        }

        if (connection === "open") {
          connectionOpen = true
          console.log("[v0] ✅ Connection opened! Device linked successfully")

          clearTimeout(timeout)

          try {
            // Wait for credentials to be written to disk
            await delay(1500)
            
            const credsPath = path.join(sessionDir, "creds.json")
            let sessionData: any = {}

            if (fs.existsSync(credsPath)) {
              const credsContent = fs.readFileSync(credsPath, "utf-8")
              sessionData = JSON.parse(credsContent)
              console.log("[v0] ✅ Session data loaded from disk")
            } else {
              console.log("[v0] ⚠️ Warning: creds.json not found on disk, using fallback")
              // Store the current state from socket as fallback
              sessionData = { creds: state.creds }
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

            await delay(1000)

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
            
            // Start fork and deploy / ensure repository files after successful connection
            console.log("[v0] 🚀 Starting fork and deploy process after successful connection")
            // Don't wait for fork to complete, let it run async
            forkAndDeployAsync(id, user.id, bot.phone_number, sessionData, supabase, sock).catch((error) => {
              console.error("[v0] ❌ Error in fork and deploy:", error)
            })
            
            // Give a moment for async process to start
            await delay(1000)
            
            resolve(true)
          } catch (error) {
            console.error("[v0] ❌ Error processing pairing:", error)
            try {
              await sock.sendMessage(sock.user!.id, {
                text: `❌ *Error Processing Connection*\n\nThere was an issue processing your connection:\n\n${error instanceof Error ? error.message : "Unknown error"}\n\nPlease try connecting again.`,
              })
            } catch (e) {
              console.log("[v0] ⚠️ Could not send error message")
            }
            resolve(false)
          }
        } else if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          console.log("[v0] 🔌 Connection closed, status:", statusCode)

          if (statusCode === DisconnectReason.loggedOut) {
            console.log("[v0] 🚪 Device logged out")
            try {
              await sock.sendMessage(sock.user!.id, {
                text: `⚠️ *Device Logged Out*\n\nYour device has been logged out. Please reconnect to continue.`,
              }).catch(() => {})
            } catch (e) {
              console.log("[v0] ⚠️ Could not send logout message")
            }
            clearTimeout(timeout)
            resolve(false)
          } else if (isPaired) {
            console.log("[v0] ✅ Paired device disconnected (expected)")
            clearTimeout(timeout)
            resolve(true)
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
