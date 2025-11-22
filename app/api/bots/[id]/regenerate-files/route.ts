import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: botId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the bot to verify ownership and get GitHub info
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    if (!bot.github_repo_url) {
      return NextResponse.json({ error: "Bot has not been deployed yet" }, { status: 400 })
    }

    console.log("[v0] 🔄 Regenerating repository files for bot:", botId)

    // Get GitHub token
    const { data: userData } = await supabase.from("users").select("github_token").eq("id", user.id).single()

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["github_token"])

    const adminToken = settings?.find((s: any) => s.setting_key === "github_token")?.setting_value
    const githubToken = userData?.github_token || adminToken

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not available" }, { status: 400 })
    }

    // Parse repository info
    const repoMatch = bot.github_repo_url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!repoMatch) {
      return NextResponse.json({ error: "Invalid repository URL" }, { status: 400 })
    }

    const repoOwner = repoMatch[1]
    const repoName = repoMatch[2]

    console.log("[v0] 📦 Repository:", `${repoOwner}/${repoName}`)

    // Get session data from database
    let sessionData = bot.session_data
    if (!sessionData) {
      return NextResponse.json({ error: "No session data available" }, { status: 400 })
    }

    // Create GitHub client
    const octokit = (await import("@octokit/rest")).Octokit
    const client = new octokit({ auth: githubToken })

    console.log("[v0] 🔍 Checking repository files...")

    // Check if creds.json exists
    let credsSha: string | undefined
    try {
      const { data: existingCreds } = await client.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: "session/creds.json",
      })
      if ("sha" in existingCreds) {
        credsSha = existingCreds.sha
      }
    } catch (error) {
      console.log("[v0] ⚠️ creds.json not found")
    }

    // Recreate creds.json
    const credsContent = JSON.stringify(sessionData.creds || sessionData, null, 2)
    await client.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: "session/creds.json",
      message: "Regenerate WhatsApp session credentials",
      content: Buffer.from(credsContent).toString("base64"),
      ...(credsSha && { sha: credsSha }),
    })
    console.log("[v0] ✅ creds.json recreated")

    // Check if workflow exists
    let workflowSha: string | undefined
    try {
      const { data: existingWorkflow } = await client.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: ".github/workflows/deploy.yml",
      })
      if ("sha" in existingWorkflow) {
        workflowSha = existingWorkflow.sha
      }
    } catch (error) {
      console.log("[v0] ⚠️ Workflow not found")
    }

    // Recreate workflow
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
      owner: repoOwner,
      repo: repoName,
      path: ".github/workflows/deploy.yml",
      message: "Regenerate deployment workflow",
      content: Buffer.from(workflowContent).toString("base64"),
      ...(workflowSha && { sha: workflowSha }),
    })
    console.log("[v0] ✅ Workflow recreated")

    console.log("[v0] ✅ Repository files regenerated successfully")
    return NextResponse.json({
      success: true,
      message: "Repository files regenerated successfully",
      repoUrl: bot.github_repo_url,
    })
  } catch (error) {
    console.error("[v0] ❌ Error regenerating repository files:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate files" },
      { status: 500 },
    )
  }
}
