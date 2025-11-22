import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { disconnectBot } from "@/lib/baileys/connection"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: botId } = await params
    const supabase = await createClient()

    console.log("[v0] 🗑️ Starting bot deletion process for:", botId)

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the bot to verify ownership
    const { data: bot, error: botError } = await supabase.from("bots").select("user_id, id").eq("id", botId).single()

    if (botError || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Verify ownership or admin status
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (bot.user_id !== user.id && !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Step 1: Disconnect active Baileys connection (if running)
    console.log("[v0] 🔌 Disconnecting active connection if any...")
    try {
      await disconnectBot(botId)
    } catch (error) {
      console.log("[v0] ⚠️ Error disconnecting bot (may not have been running):", error)
    }

    // Step 2: Wait a moment for connection to close
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Step 3: Delete session files and credentials
    const sessionDir = path.join("/tmp", "baileys_sessions", botId)
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true })
        console.log("[v0] ✅ Deleted session directory:", sessionDir)
      } catch (error) {
        console.error("[v0] ❌ Error deleting session directory:", error)
      }
    }

    // Step 4: Delete all bot logs
    console.log("[v0] 🗑️ Clearing bot logs...")
    try {
      const { error: logsError } = await supabase.from("bot_logs").delete().eq("bot_id", botId)
      if (logsError) {
        console.warn("[v0] ⚠️ Warning: Could not delete logs:", logsError)
      } else {
        console.log("[v0] ✅ Bot logs cleared")
      }
    } catch (error) {
      console.log("[v0] ⚠️ Error clearing logs:", error)
    }

    // Step 5: Delete all deployments
    console.log("[v0] 🗑️ Clearing deployment history...")
    try {
      const { error: deployError } = await supabase.from("deployments").delete().eq("bot_id", botId)
      if (deployError) {
        console.warn("[v0] ⚠️ Warning: Could not delete deployments:", deployError)
      } else {
        console.log("[v0] ✅ Deployment history cleared")
      }
    } catch (error) {
      console.log("[v0] ⚠️ Error clearing deployments:", error)
    }

    // Step 6: Delete bot from database (cascade will handle any remaining related records)
    console.log("[v0] 🗑️ Deleting bot from database...")
    const { error: deleteError } = await supabase.from("bots").delete().eq("id", botId)

    if (deleteError) {
      throw deleteError
    }

    console.log("[v0] ✅ Bot completely deleted:", botId)
    return NextResponse.json({
      success: true,
      message: "Bot deleted successfully - connection closed, session cleared, and all records removed",
    })
  } catch (error) {
    console.error("[v0] ❌ Error deleting bot:", error)
    return NextResponse.json({ error: "Failed to delete bot" }, { status: 500 })
  }
}
