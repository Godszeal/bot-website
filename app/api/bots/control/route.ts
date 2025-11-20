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

    const { botId, action } = await request.json()

    if (!botId || !action) {
      return NextResponse.json({ error: "Bot ID and action are required" }, { status: 400 })
    }

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
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

    // Update bot status based on action
    let newStatus = bot.status
    let logMessage = ""

    switch (action) {
      case "start":
        if (bot.status === "active") {
          return NextResponse.json({ error: "Bot is already running" }, { status: 400 })
        }
        newStatus = "active"
        logMessage = "Bot started"
        break
      case "stop":
        if (bot.status === "inactive") {
          return NextResponse.json({ error: "Bot is already stopped" }, { status: 400 })
        }
        newStatus = "inactive"
        logMessage = "Bot stopped"
        break
      case "restart":
        if (bot.status === "inactive") {
          return NextResponse.json({ error: "Cannot restart an inactive bot" }, { status: 400 })
        }
        newStatus = "active"
        logMessage = "Bot restarted"
        break
    }

    // Update bot status
    const { error: updateError } = await supabase.from("bots").update({ status: newStatus }).eq("id", botId)

    if (updateError) {
      throw updateError
    }

    // Log the action
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "info",
      message: logMessage,
      metadata: { action, previous_status: bot.status, new_status: newStatus },
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error("Error controlling bot:", error)
    return NextResponse.json({ error: "Failed to control bot" }, { status: 500 })
  }
}
