import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createBaileysConnection, cleanupSession } from "@/lib/baileys/connection"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    if (!bot.phone_number) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 400 })
    }

    cleanupSession(bot.id)

    await supabase
      .from("bots")
      .update({
        status: "pairing",
        pairing_code: null,
        is_connected: false,
      })
      .eq("id", bot.id)

    const { data: channelSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_channel_jid")
      .single()

    const channelJid = channelSetting?.setting_value || null
    const cleanNumber = bot.phone_number.replace(/[^0-9]/g, "")

    console.log("[v0] 🔄 Regenerating pairing code with 2-minute window...")

    let pairingCodeResolve: (code: string) => void
    let pairingCodeReject: (error: Error) => void

    const pairingCodePromise = new Promise<string>((resolve, reject) => {
      pairingCodeResolve = resolve
      pairingCodeReject = reject

      setTimeout(() => {
        reject(new Error("Pairing code generation timeout"))
      }, 50000) // 50 seconds to generate code
    })

    createBaileysConnection({
      botId: bot.id,
      phoneNumber: cleanNumber,
      channelJid,
      onPairingCode: async (code) => {
        console.log("[v0] ✅ New pairing code generated:", code)
        const { error: updateError } = await supabase
          .from("bots")
          .update({
            pairing_code: code,
            status: "pairing",
          })
          .eq("id", bot.id)

        if (updateError) {
          pairingCodeReject(new Error(`Failed to save pairing code: ${updateError.message}`))
        } else {
          pairingCodeResolve(code)
        }
      },
      onConnected: async (sessionData) => {
        console.log("[v0] ✅ Bot connected after regeneration")
        await supabase
          .from("bots")
          .update({
            status: "active",
            is_connected: true,
            connected_at: new Date().toISOString(),
          })
          .eq("id", bot.id)
      },
      onDisconnected: async (reason) => {
        console.log("[v0] 🔌 Bot disconnected:", reason)
        await supabase
          .from("bots")
          .update({
            status: "inactive",
            is_connected: false,
          })
          .eq("id", bot.id)
      },
    }).catch((error) => {
      pairingCodeReject(error)
    })

    const pairingCode = await pairingCodePromise

    return NextResponse.json({
      success: true,
      pairing_code: pairingCode,
      message: "You have 2 minutes to enter this code in WhatsApp",
    })
  } catch (error) {
    console.error("[v0] ❌ Error regenerating pairing code:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate pairing code" },
      { status: 500 },
    )
  }
}
