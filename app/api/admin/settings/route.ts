import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and admin status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin, role")
      .eq("id", user.id)
      .single()

    if (userError || (!userData?.is_admin && userData?.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { settings } = await request.json()

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings data" }, { status: 400 })
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      const { error: updateError } = await supabase
        .from("admin_settings")
        .update({
          setting_value: value as string,
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", key)

      if (updateError) {
        console.error(`[v0] Error updating setting ${key}:`, updateError)
        throw updateError
      }
    }

    console.log("[v0] Admin settings updated successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating admin settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication and admin status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin, role")
      .eq("id", user.id)
      .single()

    if (userError || (!userData?.is_admin && userData?.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Fetch all settings
    const { data: settings, error: settingsError } = await supabase
      .from("admin_settings")
      .select("*")
      .order("setting_key")

    if (settingsError) {
      throw settingsError
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Error fetching admin settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}
