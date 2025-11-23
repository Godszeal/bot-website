import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createBaileysConnection, cleanupSession, sendRepositoryNotification } from "@/lib/baileys/connection"
import { Octokit } from "@octokit/rest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // 1 minute for user to enter pairing code

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
    console.log("[v0] Creating bot with phone number:", cleanNumber)

    if (cleanNumber.length < 10) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

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
      console.error("[v0] Error creating bot:", botError)
      return NextResponse.json({ error: "Failed to create bot" }, { status: 500 })
    }

    console.log("[v0] Bot created in database:", bot.id)

    const { data: channelSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_channel_jid")
      .single()

    const channelJid = channelSetting?.setting_value || null

    try {
      console.log("[v0] Starting Baileys connection for bot:", bot.id)

      let pairingCodeResolve: (code: string) => void
      let pairingCodeReject: (error: Error) => void

      const pairingCodePromise = new Promise<string>((resolve, reject) => {
        pairingCodeResolve = resolve
        pairingCodeReject = reject

        setTimeout(() => {
          console.error("[v0] ⏰ Pairing code generation timeout after 50 seconds")
          reject(new Error("Pairing code generation timeout - please try again"))
        }, 50000) // 50 seconds
      })

      createBaileysConnection({
        botId: bot.id,
        phoneNumber: cleanNumber,
        channelJid,
        onPairingCode: async (code) => {
          console.log("[v0] Pairing code callback triggered with code:", code)
          console.log("[v0] Attempting to update bot ID:", bot.id)

          try {
            const { data: updatedBot, error: updateError } = await supabase
              .from("bots")
              .update({
                pairing_code: code,
                status: "pairing",
              })
              .eq("id", bot.id)
              .select()
              .single()

            if (updateError) {
              console.error("[v0] Database update error:", {
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code,
              })
              pairingCodeReject(new Error(`Failed to save pairing code: ${updateError.message}`))
            } else {
              console.log("[v0] Bot updated successfully:", updatedBot)
              pairingCodeResolve(code)
            }
          } catch (catchError) {
            console.error("[v0] Unexpected error in pairing code callback:", catchError)
            pairingCodeReject(
              new Error(`Unexpected error: ${catchError instanceof Error ? catchError.message : String(catchError)}`),
            )
          }
        },
        onConnected: async (sessionData) => {
          console.log("[v0] Bot connected, starting fork and deploy")
          await supabase
            .from("bots")
            .update({
              status: "active",
              is_connected: true,
              connected_at: new Date().toISOString(),
            })
            .eq("id", bot.id)

          forkAndDeploy(bot.id, user.id, phoneNumber, sessionData, supabase).catch((error) => {
            console.error("[v0] Error in fork and deploy:", error)
          })
        },
        onDisconnected: async (reason) => {
          console.log("[v0] Bot disconnected:", reason)
          await supabase
            .from("bots")
            .update({
              status: "inactive",
              is_connected: false,
            })
            .eq("id", bot.id)

          cleanupSession(bot.id)
        },
      }).catch((error) => {
        console.error("[v0] Error in createBaileysConnection:", error)
        pairingCodeReject(error)
      })

      const pairingCode = await pairingCodePromise
      console.log("[v0] Pairing code ready to send to client:", pairingCode)

      return NextResponse.json({
        bot: {
          ...bot,
          pairing_code: pairingCode,
          status: "pairing",
        },
      })
    } catch (error) {
      console.error("[v0] Error starting Baileys connection:", error)
      console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

      await supabase.from("bots").delete().eq("id", bot.id)

      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to start WhatsApp connection" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Error in create bot API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function forkAndDeploy(botId: string, userId: string, phoneNumber: string, sessionData: any, supabase: any) {
  try {
    const { data: userData } = await supabase.from("users").select("github_token").eq("id", userId).single()

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
      throw new Error("Invalid main repository URL")
    }

    const [, repoOwner, repoName] = repoMatch

    const githubToken = userData?.github_token || process.env.ADMIN_GITHUB_TOKEN || settingsMap?.github_token
    if (!githubToken) {
      throw new Error("No GitHub token available. Please connect your GitHub account or contact admin.")
    }

    const octokit = new Octokit({ auth: githubToken })

    const { data: authenticatedUser } = await octokit.users.getAuthenticated()
    const targetOwner = authenticatedUser.login

    console.log("[v0] Checking for existing fork of", repoOwner, repoName, "for user", targetOwner)

    let fork
    try {
      const { data: existingFork } = await octokit.repos.get({
        owner: targetOwner,
        repo: repoName,
      })

      if (existingFork && existingFork.fork && existingFork.parent?.full_name === `${repoOwner}/${repoName}`) {
        console.log("[v0] Found existing fork:", existingFork.full_name)
        fork = existingFork

        try {
          await octokit.activity.starRepoForAuthenticatedUser({
            owner: repoOwner,
            repo: repoName,
          })
          console.log("[v0] ⭐ Starred main repository")
        } catch (starError) {
          console.log("[v0] Could not star repository:", starError)
        }
      } else {
        throw new Error("Not a fork or different source")
      }
    } catch (error) {
      console.log("[v0] No existing fork found, creating new fork...")
      const { data: newFork } = await octokit.repos.createFork({
        owner: repoOwner,
        repo: repoName,
      })
      fork = newFork

      console.log("[v0] Waiting for fork to be ready...")
      await new Promise((resolve) => setTimeout(resolve, 8000))

      try {
        await octokit.activity.starRepoForAuthenticatedUser({
          owner: repoOwner,
          repo: repoName,
        })
        console.log("[v0] ⭐ Starred main repository")
      } catch (starError) {
        console.log("[v0] Could not star repository:", starError)
      }
    }

    const credsContent = JSON.stringify(sessionData.creds, null, 2)
    let credsSha: string | undefined

    try {
      const { data: existingCreds } = await octokit.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: "session/creds.json",
      })
      if ("sha" in existingCreds) {
        credsSha = existingCreds.sha
        console.log("[v0] Found existing creds.json with SHA:", credsSha)
      }
    } catch (error) {
      console.log("[v0] No existing creds.json found, will create new one")
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: "session/creds.json",
      message: credsSha ? "Update WhatsApp session credentials" : "Add WhatsApp session credentials",
      content: Buffer.from(credsContent).toString("base64"),
      ...(credsSha && { sha: credsSha }),
    })

    console.log("[v0] ✅ Session uploaded as creds.json to session folder")

    const packageLockContent = {
      name: "God's Zeal Xmd",
      version: "1.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: {
        "": {
          name: "God's Zeal Xmd",
          version: "1.0.0",
          license: "ISC",
          dependencies: {
            "@adiwajshing/keyed-db": "^0.2.4",
            "@ffmpeg/ffmpeg": "^0.12.15",
            "@hapi/boom": "^10.0.1",
            "@types/node": "^18.0.6",
            "@whiskeysockets/baileys": "^6.7.18",
            "awesome-phonenumber": "^5.9.0",
            axios: "^1.8.4",
            "adm-zip": "^0.5.10",
            chalk: "^4.1.2",
            cheerio: "^1.0.0-rc.12",
            cookie: "^0.5.0",
            dotenv: "^16.4.5",
            events: "^3.3.0",
            "file-type": "^16.5.4",
            "fluent-ffmpeg": "^2.1.3",
            "form-data": "^4.0.1",
            "fs-extra": "^11.2.0",
            gtts: "^0.2.1",
            "human-readable": "^0.2.1",
            jimp: "^1.6.0",
            jsdom: "^22.1.0",
            "libphonenumber-js": "^1.11.18",
            libsignal: "^2.0.1",
            "link-preview-js": "^3.0.5",
            "moment-timezone": "^0.5.43",
            mumaker: "^2.0.0",
            "node-cache": "^5.1.2",
            "node-fetch": "^2.7.0",
            "node-id3": "^0.2.3",
            "node-webpmux": "^3.1.0",
            "node-youtube-music": "^0.8.3",
            "performance-now": "^2.1.0",
            phin: "^3.7.1",
            pino: "^8.21.0",
            qrcode: "^1.5.4",
            "qrcode-reader": "^1.0.4",
            "qrcode-terminal": "^0.12.0",
            request: "^2.88.2",
            "ruhend-scraper": "^8.3.0",
            "safe-stable-stringify": "^2.5.0",
            "set-cookie": "^0.0.4",
            sharp: "^0.32.6",
            "tough-cookie": "^5.0.0",
            "translate-google-api": "^1.0.4",
            ws: "^8.17.1",
            yargs: "^17.6.0",
            "yargs-parser": "^21.1.1",
            "youtube-yts": "^2.0.0",
            "youtubedl-core": "^4.11.7",
            "yt-search": "^2.12.1",
            "ytdl-core": "^4.11.5",
          },
        },
      },
    }

    let packageLockSha: string | undefined
    try {
      const { data: existingPackageLock } = await octokit.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: "package-lock.json",
      })
      if ("sha" in existingPackageLock) {
        packageLockSha = existingPackageLock.sha
        console.log("[v0] Found existing package-lock.json with SHA:", packageLockSha)
      }
    } catch (error) {
      console.log("[v0] No existing package-lock.json found, will create new one")
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: "package-lock.json",
      message: packageLockSha ? "Update package-lock.json" : "Add package-lock.json for npm caching",
      content: Buffer.from(JSON.stringify(packageLockContent, null, 2)).toString("base64"),
      ...(packageLockSha && { sha: packageLockSha }),
    })

    console.log("[v0] ✅ package-lock.json created/updated")

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
        run: |
          if [ -f "package-lock.json" ]; then
            echo "Using package-lock.json"
            npm ci
          else
            echo "No package-lock.json found, using npm install"
            npm install
          fi
      
      - name: Verify session file
        run: |
          if [ -f "session/creds.json" ]; then
            echo "✅ Session file found"
          else
            echo "❌ Session file not found"
            exit 1
          fi
      
      - name: Start bot
        run: |
          echo "Starting WhatsApp bot..."
          timeout 3600 npm start || echo "Bot stopped after 1 hour"
        env:
          NODE_ENV: production
`

    let workflowSha: string | undefined
    try {
      const { data: existingWorkflow } = await octokit.repos.getContent({
        owner: fork.owner.login,
        repo: fork.name,
        path: ".github/workflows/deploy.yml",
      })
      if ("sha" in existingWorkflow) {
        workflowSha = existingWorkflow.sha
        console.log("[v0] Found existing workflow with SHA:", workflowSha)
      }
    } catch (error) {
      console.log("[v0] No existing workflow found, will create new one")
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: ".github/workflows/deploy.yml",
      message: workflowSha ? "Update deployment workflow" : "Add deployment workflow",
      content: Buffer.from(workflowContent).toString("base64"),
      ...(workflowSha && { sha: workflowSha }),
    })

    console.log("[v0] ✅ Workflow configured successfully")

    await supabase
      .from("bots")
      .update({
        github_repo_url: fork.html_url,
        github_repo_name: fork.full_name,
        github_branch: fork.default_branch || "main",
        status: "active",
        last_deployed_at: new Date().toISOString(),
      })
      .eq("id", botId)

    console.log("[v0] ✅ Bot deployed successfully:", fork.html_url)

    await sendRepositoryNotification(botId, phoneNumber, fork.html_url)

    console.log("[v0] ✅ Bot deployment completed successfully")
  } catch (error) {
    console.error("[v0] ❌ Error forking and deploying:", error)
    await supabase
      .from("bots")
      .update({
        status: "error",
      })
      .eq("id", botId)
  }
}
