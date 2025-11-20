import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // Get GitHub token from session
      const githubToken = session.provider_token

      // Update user with GitHub token
      if (githubToken) {
        await supabase.from("users").update({ github_token: githubToken }).eq("id", session.user.id)
      }
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
}
