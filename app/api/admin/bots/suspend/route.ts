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

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { botId } = await request.json()

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 })
    }

    // Update bot status to suspended
    const { error: updateError } = await supabase.from("bots").update({ status: "suspended" }).eq("id", botId)

    if (updateError) {
      throw updateError
    }

    // Log the suspension
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      level: "warn",
      message: "Bot suspended by admin",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error suspending bot:", error)
    return NextResponse.json({ error: "Failed to suspend bot" }, { status: 500 })
  }
}
