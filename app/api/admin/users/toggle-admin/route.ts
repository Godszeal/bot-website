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

    const { userId, isAdmin } = await request.json()

    if (!userId || typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "User ID and admin status are required" }, { status: 400 })
    }

    // Update user admin status
    const { error: updateError } = await supabase.from("users").update({ is_admin: isAdmin }).eq("id", userId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error toggling admin status:", error)
    return NextResponse.json({ error: "Failed to update admin status" }, { status: 500 })
  }
}
