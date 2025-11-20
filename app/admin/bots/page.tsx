import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { AdminBotsTable } from "@/components/admin-bots-table"
import { Button } from "@/components/ui/button"
import { Settings, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function AdminBotsPage() {
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

  // Fetch all bots with user information
  const { data: bots, error: botsError } = await supabase
    .from("bots")
    .select(`
      *,
      users (
        email,
        full_name
      )
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">All Bots</h1>
              <p className="text-muted-foreground mt-1">Monitor and manage all bots on the platform</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/admin/settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>

        {botsError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
            Error loading bots: {botsError.message}
          </div>
        )}

        {bots && <AdminBotsTable bots={bots} />}
      </main>
    </div>
  )
}
