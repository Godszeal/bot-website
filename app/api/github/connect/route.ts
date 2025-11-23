import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("github_token").eq("id", user.id).single()

    if (userData?.github_token) {
      return NextResponse.json({ connected: true, token: "present" })
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/github/callback`,
        scopes: "repo workflow user:email",
      },
    })

    if (error) {
      console.error("[v0] GitHub OAuth init error:", error)
      return NextResponse.json({ error: "Failed to initiate GitHub connection" }, { status: 500 })
    }

    return NextResponse.json({ authUrl: data.url })
  } catch (error) {
    console.error("[v0] Error connecting GitHub:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ connected: false }, { status: 200 })
    }

    const { data: userData } = await supabase.from("users").select("github_token").eq("id", user.id).single()

    return NextResponse.json({
      connected: !!userData?.github_token,
      hasAdminToken: !!process.env.ADMIN_GITHUB_TOKEN,
    })
  } catch (error) {
    console.error("[v0] Error checking GitHub connection:", error)
    return NextResponse.json({ connected: false }, { status: 200 })
  }
}
