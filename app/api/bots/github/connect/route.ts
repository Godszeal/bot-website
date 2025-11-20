import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const { botId, repoUrl, branch } = await request.json()

    if (!botId || !repoUrl) {
      return NextResponse.json({ error: "Bot ID and repository URL are required" }, { status: 400 })
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

    // Extract repo name from URL
    const repoMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)
    const repoName = repoMatch ? repoMatch[1] : repoUrl

    // Update bot with GitHub repository info
    const { error: updateError } = await supabase
      .from("bots")
      .update({
        github_repo_url: repoUrl,
        github_repo_name: repoName,
        github_branch: branch || "main",
      })
      .eq("id", botId)

    if (updateError) {
      throw updateError
    }

    // Log the connection
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "info",
      message: `GitHub repository connected: ${repoName}`,
      metadata: { repo_url: repoUrl, branch: branch || "main" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error connecting GitHub repository:", error)
    return NextResponse.json({ error: "Failed to connect repository" }, { status: 500 })
  }
}
