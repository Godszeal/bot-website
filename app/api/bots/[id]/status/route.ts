import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get bot with latest status
    const { data: bot, error } = await supabase.from("bots").select("*").eq("id", id).eq("user_id", user.id).single()

    if (error || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    return NextResponse.json({ bot })
  } catch (error) {
    console.error("[v0] Error fetching bot status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
