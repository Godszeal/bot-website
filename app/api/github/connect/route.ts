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

    if (!userData?.github_token) {
      // Trigger GitHub OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: "https://etjiaukapkfutvgyerim.supabase.co/auth/v1/callback",
          scopes: "repo workflow",
        },
      })

      if (error) {
        return NextResponse.json({ error: "Failed to initiate GitHub connection" }, { status: 500 })
      }

      return NextResponse.json({ authUrl: data.url })
    }

    return NextResponse.json({ connected: true })
  } catch (error) {
    console.error("[v0] Error connecting GitHub:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
