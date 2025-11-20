import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { botId } = await request.json()

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 })
    }

    // Verify bot ownership
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    const { data: githubTokenSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "github_token")
      .single()

    const { data: mainRepoSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "main_bot_repo")
      .single()

    const { data: repoOwnerSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "main_bot_repo_owner")
      .single()

    const { data: repoNameSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "main_bot_repo_name")
      .single()

    if (!githubTokenSetting?.setting_value) {
      return NextResponse.json({ error: "GitHub token not configured. Please contact admin." }, { status: 400 })
    }

    if (!mainRepoSetting?.setting_value || !repoOwnerSetting?.setting_value || !repoNameSetting?.setting_value) {
      return NextResponse.json({ error: "Main bot repository not configured. Please contact admin." }, { status: 400 })
    }

    const githubToken = githubTokenSetting.setting_value
    const mainRepoOwner = repoOwnerSetting.setting_value
    const mainRepoName = repoNameSetting.setting_value

    const octokit = new Octokit({ auth: githubToken })

    // Get user's GitHub username
    const { data: userData } = await supabase.from("users").select("github_username, email").eq("id", user.id).single()

    const targetOwner = userData?.github_username || user.email?.split("@")[0] || user.id.substring(0, 8)
    const forkedRepoName = `${mainRepoName}-${bot.name.toLowerCase().replace(/\s+/g, "-")}`

    let forkedRepo
    try {
      const { data: existingRepo } = await octokit.repos.get({
        owner: targetOwner,
        repo: forkedRepoName,
      })
      forkedRepo = existingRepo
      console.log("Fork already exists:", forkedRepo.full_name)
    } catch (error: any) {
      if (error.status === 404) {
        console.log("Creating fork of", mainRepoOwner, "/", mainRepoName)
        const { data: newFork } = await octokit.repos.createFork({
          owner: mainRepoOwner,
          repo: mainRepoName,
          name: forkedRepoName,
        })
        forkedRepo = newFork

        // Wait for fork to be ready
        await new Promise((resolve) => setTimeout(resolve, 3000))
      } else {
        throw error
      }
    }

    const botConfigContent = {
      botId: botId,
      phoneNumber: bot.phone_number,
      botName: bot.name,
      webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.vercel.app"}/api/webhooks/pairing`,
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: forkedRepo.owner.login,
      repo: forkedRepo.name,
      path: "config/bot-config.json",
      message: "Add bot configuration",
      content: Buffer.from(JSON.stringify(botConfigContent, null, 2)).toString("base64"),
    })

    try {
      await octokit.repos.getContent({
        owner: forkedRepo.owner.login,
        repo: forkedRepo.name,
        path: "session",
      })
    } catch (error: any) {
      if (error.status === 404) {
        await octokit.repos.createOrUpdateFileContents({
          owner: forkedRepo.owner.login,
          repo: forkedRepo.name,
          path: "session/.gitkeep",
          message: "Create session folder",
          content: Buffer.from("").toString("base64"),
        })
      }
    }

    const workflowContent = `name: Deploy WhatsApp Bot

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start bot
        run: npm start
        env:
          BOT_ID: \${{ secrets.BOT_ID }}
          PHONE_NUMBER: \${{ secrets.PHONE_NUMBER }}
          WEBHOOK_URL: \${{ secrets.WEBHOOK_URL }}
`

    await octokit.repos.createOrUpdateFileContents({
      owner: forkedRepo.owner.login,
      repo: forkedRepo.name,
      path: ".github/workflows/deploy.yml",
      message: "Add deployment workflow",
      content: Buffer.from(workflowContent).toString("base64"),
    })

    try {
      // Get repository public key for encrypting secrets
      const { data: publicKey } = await octokit.actions.getRepoPublicKey({
        owner: forkedRepo.owner.login,
        repo: forkedRepo.name,
      })

      // Note: In production, you would encrypt these secrets using the public key
      // For now, we'll just log that they need to be set manually
      console.log("Repository secrets need to be set:", {
        BOT_ID: botId,
        PHONE_NUMBER: bot.phone_number,
        WEBHOOK_URL: botConfigContent.webhookUrl,
      })
    } catch (error) {
      console.error("Error setting repository secrets:", error)
    }

    const { error: updateError } = await supabase
      .from("bots")
      .update({
        github_repo_url: forkedRepo.html_url,
        github_repo_name: forkedRepo.full_name,
        github_branch: "main",
        status: "deploying",
        last_deployed_at: new Date().toISOString(),
      })
      .eq("id", botId)

    if (updateError) {
      throw updateError
    }

    const { data: deployment } = await supabase
      .from("deployments")
      .insert({
        bot_id: botId,
        status: "pending",
        commit_sha: "initial",
        commit_message: "Initial bot deployment",
      })
      .select()
      .single()

    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "info",
      message: "Bot deployment initiated. Repository forked and workflow created.",
      metadata: {
        deployment_id: deployment?.id,
        repo_url: forkedRepo.html_url,
      },
    })

    return NextResponse.json({
      success: true,
      repoUrl: forkedRepo.html_url,
      deploymentId: deployment?.id,
      message: "Bot deployed successfully. The pairing code will be generated when the bot starts.",
    })
  } catch (error) {
    console.error("Error deploying bot:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to deploy bot",
      },
      { status: 500 },
    )
  }
}
