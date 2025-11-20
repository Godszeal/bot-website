import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function BotSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch bot details
  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (botError || !bot) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bot Settings</h1>
          <p className="text-muted-foreground mt-1">{bot.name}</p>
        </div>

        <div className="text-center py-16 text-muted-foreground">Bot settings will appear here</div>
      </main>
    </div>
  )
}
