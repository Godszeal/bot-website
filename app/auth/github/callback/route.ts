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
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.session?.provider_token && data.user) {
      // Check if user exists, if not create
      const { data: existingUser } = await supabase.from("users").select("id").eq("id", data.user.id).single()

      if (!existingUser) {
        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          full_name:
            data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0],
          avatar_url: data.user.user_metadata?.avatar_url,
          github_token: data.session.provider_token,
        })
      } else {
        // Update existing user with GitHub token
        await supabase
          .from("users")
          .update({
            github_token: data.session.provider_token,
            avatar_url: data.user.user_metadata?.avatar_url,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || existingUser.full_name,
          })
          .eq("id", data.user.id)
      }

      console.log("[v0] GitHub token stored successfully for user:", data.user.id)
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
