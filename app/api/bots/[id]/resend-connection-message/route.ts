import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getActiveConnection, sendMessageToUser } from "@/lib/baileys/connection"

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

    // Get the bot to verify ownership and get details
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("user_id, id, phone_number, name")
      .eq("id", botId)
      .single()

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

    // Get active connection
    const sock = getActiveConnection(botId)
    if (!sock || !sock.user) {
      return NextResponse.json({ error: "Bot is not currently connected" }, { status: 400 })
    }

    // Send connection status message
    const welcomeMsg = `✅ *Connection Successful!*\n\n📱 *Phone Number:* ${bot.phone_number}\n🤖 *Bot:* ${bot.name || "God's Zeal Xmd"}\n⏰ *Connected:* ${new Date().toLocaleString()}\n\n🎉 Your WhatsApp bot is now active!`

    try {
      await sock.sendMessage(sock.user.id, {
        text: welcomeMsg,
      })
      console.log("[v0] ✅ Connection status message resent successfully")
      return NextResponse.json({ success: true, message: "Connection status message sent" })
    } catch (error) {
      console.error("[v0] ❌ Error resending connection message:", error)
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] ❌ Error in resend connection message:", error)
    return NextResponse.json({ error: "Failed to resend connection message" }, { status: 500 })
  }
}
