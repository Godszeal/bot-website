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

    const { botId, phoneNumber } = await request.json()

    if (!botId || !phoneNumber) {
      return NextResponse.json({ error: "Bot ID and phone number are required" }, { status: 400 })
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

    // Update bot with phone number and set status to deploying
    const { error: updateError } = await supabase
      .from("bots")
      .update({
        phone_number: phoneNumber,
        status: "deploying",
      })
      .eq("id", botId)

    if (updateError) {
      throw updateError
    }

    // Log the pairing request
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "info",
      message: `Pairing request initiated for ${phoneNumber}`,
      metadata: { phone_number: phoneNumber },
    })

    return NextResponse.json({
      message: "Bot deployment initiated. Pairing code will be generated during deployment.",
      status: "deploying",
    })
  } catch (error) {
    console.error("Error initiating pairing:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to initiate pairing",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { botId, pairingCode, secret } = await request.json()

    if (!botId || !pairingCode || !secret) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update bot with pairing code
    const { error: updateError } = await supabase
      .from("bots")
      .update({
        pairing_code: pairingCode,
        status: "pairing",
      })
      .eq("id", botId)

    if (updateError) {
      throw updateError
    }

    // Log the pairing code generation
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "info",
      message: `Pairing code generated: ${pairingCode}`,
      metadata: { pairing_code: pairingCode },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating pairing code:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update pairing code",
      },
      { status: 500 },
    )
  }
}
