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

    // Store GitHub access token and username if available
    if (data.session?.provider_token && data.user) {
      const updateData: any = { 
        github_token: data.session.provider_token 
      }
      
      // Try to get GitHub username from user metadata
      if (data.user.user_metadata?.user_name) {
        updateData.github_username = data.user.user_metadata.user_name
        console.log("[v0] GitHub username:", data.user.user_metadata.user_name)
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", data.user.id)

      if (updateError) {
        console.error("[v0] Error storing GitHub data:", updateError)
      } else {
        console.log("[v0] ✅ GitHub token and username stored successfully")
      }
    }
  }

  // Always redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
