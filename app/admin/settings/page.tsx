import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { AdminSettingsForm } from "@/components/admin-settings-form"

export default async function AdminSettingsPage() {
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

  // Fetch admin settings
  const { data: settings, error: settingsError } = await supabase
    .from("admin_settings")
    .select("*")
    .order("setting_key")

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">Configure platform-wide settings</p>
        </div>

        {settingsError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
            Error loading settings: {settingsError.message}
          </div>
        )}

        {settings && <AdminSettingsForm settings={settings} />}
      </main>
    </div>
  )
}
