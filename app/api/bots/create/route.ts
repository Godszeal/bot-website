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

    const githubToken = userData?.github_token || settingsMap?.github_token
    if (!githubToken) {
      throw new Error("No GitHub token available")
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
      
      // Wait for fork to be ready
      console.log("[v0] Waiting for fork to be ready...")
      await new Promise((resolve) => setTimeout(resolve, 8000))
    }

    const credsContent = JSON.stringify(sessionData.creds, null, 2)

    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: "session/creds.json",
      message: "Add WhatsApp session credentials",
      content: Buffer.from(credsContent).toString("base64"),
    })

    console.log("[v0] Session uploaded as creds.json to session folder")

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
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start bot
        run: npm start
        env:
          NODE_ENV: production
`

    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: ".github/workflows/deploy.yml",
      message: "Add deployment workflow",
      content: Buffer.from(workflowContent).toString("base64"),
    })

    console.log("[v0] Workflow created successfully")

    // Update bot with repo info
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

    // Send success notification to user's WhatsApp
    await sendRepositoryNotification(botId, phoneNumber, fork.html_url)
  } catch (error) {
    console.error("[v0] Error forking and deploying:", error)
    await supabase
      .from("bots")
      .update({
        status: "error",
      })
      .eq("id", botId)
  }
}
