import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { BotPairingCard } from "@/components/bot-pairing-card"
import { BotInfoCard } from "@/components/bot-info-card"
import { BotActionsCard } from "@/components/bot-actions-card"
import { GitHubConnectCard } from "@/components/github-connect-card"
import { BotControlCard } from "@/components/bot-control-card"
import { BotLogsCard } from "@/components/bot-logs-card"

export default async function BotDetailPage({
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

  const { data: logs } = await supabase
    .from("bot_logs")
    .select("*")
    .eq("bot_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{bot.name}</h1>
          <p className="text-muted-foreground mt-1">{bot.description || "No description"}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <BotInfoCard bot={bot} />
            <BotControlCard bot={bot} />
            <BotActionsCard bot={bot} />
            <GitHubConnectCard bot={bot} />
          </div>
          <div className="space-y-6">
            <BotPairingCard bot={bot} />
            <BotLogsCard botId={bot.id} initialLogs={logs || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
