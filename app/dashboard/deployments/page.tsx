import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { DeploymentsList } from "@/components/deployments-list"

export default async function DeploymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch deployments for user's bots
  const { data: deployments, error: deploymentsError } = await supabase
    .from("deployments")
    .select(`
      *,
      bots (
        id,
        name,
        user_id
      )
    `)
    .eq("bots.user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Deployments</h1>
          <p className="text-muted-foreground mt-1">View deployment history and status</p>
        </div>

        {deploymentsError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
            Error loading deployments: {deploymentsError.message}
          </div>
        )}

        {deployments && deployments.length > 0 ? (
          <DeploymentsList deployments={deployments} />
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No deployments yet. Deploy your first bot to see history here.
          </div>
        )}
      </main>
    </div>
  )
}
