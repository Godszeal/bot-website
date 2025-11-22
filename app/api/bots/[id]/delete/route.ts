import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

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

    // Delete session files
    const sessionDir = path.join("/tmp", "baileys_sessions", botId)
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true })
        console.log("[v0] 🗑️ Deleted session directory:", sessionDir)
      } catch (error) {
        console.error("[v0] ❌ Error deleting session directory:", error)
      }
    }

    // Delete bot from database (cascade will handle related records)
    const { error: deleteError } = await supabase.from("bots").delete().eq("id", botId)

    if (deleteError) {
      throw deleteError
    }

    console.log("[v0] ✅ Bot deleted successfully:", botId)
    return NextResponse.json({ success: true, message: "Bot deleted successfully" })
  } catch (error) {
    console.error("[v0] ❌ Error deleting bot:", error)
    return NextResponse.json({ error: "Failed to delete bot" }, { status: 500 })
  }
}
