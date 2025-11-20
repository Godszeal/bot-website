import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { AdminStatsCards } from "@/components/admin-stats-cards"
import { AdminUsersTable } from "@/components/admin-users-table"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (userDataError || !userData?.is_admin) {
    redirect("/dashboard")
  }

  // Fetch admin statistics
  const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true })

  const { count: totalBots } = await supabase.from("bots").select("*", { count: "exact", head: true })

  const { count: activeBots } = await supabase
    .from("bots")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")

  const { count: totalDeployments } = await supabase.from("deployments").select("*", { count: "exact", head: true })

  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Manage users and monitor platform activity</p>
          </div>
          <Button asChild>
            <Link href="/admin/settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>

        <AdminStatsCards
          totalUsers={totalUsers || 0}
          totalBots={totalBots || 0}
          activeBots={activeBots || 0}
          totalDeployments={totalDeployments || 0}
        />

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Users</h2>
          {usersError && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
              Error loading users: {usersError.message}
            </div>
          )}
          {users && <AdminUsersTable users={users} />}
        </div>
      </main>
    </div>
  )
}
