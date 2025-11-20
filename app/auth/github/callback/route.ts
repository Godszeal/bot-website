import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[v0] GitHub OAuth error:", error)
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
    }

    // Store GitHub access token if available
    if (data.session?.provider_token) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ github_token: data.session.provider_token })
        .eq("id", data.user?.id)

      if (updateError) {
        console.error("[v0] Error storing GitHub token:", updateError)
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
