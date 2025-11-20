import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { AllLogsView } from "@/components/all-logs-view"

export default async function LogsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch logs for all user's bots
  const { data: logs, error: logsError } = await supabase
    .from("bot_logs")
    .select(`
      *,
      bots (
        id,
        name,
        user_id
      )
    `)
    .eq("bots.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground mt-1">Monitor your bot activity and errors</p>
        </div>

        {logsError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
            Error loading logs: {logsError.message}
          </div>
        )}

        {logs && logs.length > 0 ? (
          <AllLogsView logs={logs} />
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No logs yet. Bot logs will appear here when your bots are active.
          </div>
        )}
      </main>
    </div>
  )
}
