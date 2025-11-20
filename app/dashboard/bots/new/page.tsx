import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { CreateBotForm } from "@/components/create-bot-form"

export default async function NewBotPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Bot</h1>
          <p className="text-muted-foreground mt-1">Set up a new WhatsApp bot deployment</p>
        </div>

        <CreateBotForm userId={user.id} />
      </main>
    </div>
  )
}
