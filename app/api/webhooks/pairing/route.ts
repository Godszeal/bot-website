import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { botId, pairingCode, sessionData, status, error } = await request.json()

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Update bot with pairing code or session data
    const updateData: any = {}

    if (pairingCode) {
      updateData.pairing_code = pairingCode
      updateData.status = "pairing"
    }

    if (sessionData) {
      updateData.status = "active"
    }

    if (status) {
      updateData.status = status
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase.from("bots").update(updateData).eq("id", botId)

      if (updateError) {
        throw updateError
      }
    }

    // Log the webhook event
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: error ? "error" : "info",
      message: error || (pairingCode ? `Pairing code generated: ${pairingCode}` : "Session data received"),
      metadata: { pairingCode, hasSessionData: !!sessionData, status, error },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 },
    )
  }
}
