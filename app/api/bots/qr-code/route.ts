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

    // Update bot status to deploying
    const { error: updateError } = await supabase
      .from("bots")
      .update({
        status: "deploying",
      })
      .eq("id", botId)

    if (updateError) {
      throw updateError
    }

    // Log the QR code request
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "info",
      message: "QR code pairing requested. Deploy the bot to generate QR code.",
    })

    return NextResponse.json({
      message: "QR code will be generated when the bot is deployed. Please deploy your bot first.",
      status: "deploying",
    })
  } catch (error) {
    console.error("Error requesting QR code:", error)
    return NextResponse.json({ error: "Failed to request QR code" }, { status: 500 })
  }
}
