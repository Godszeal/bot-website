import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { BotCard } from "@/components/bot-card"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch user's bots
  const { data: bots, error: botsError } = await supabase
    .from("bots")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Bots</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage and deploy your WhatsApp bots</p>
          </div>
          <Link href="/dashboard/bots/new" className="w-full sm:w-auto">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Create Bot
            </Button>
          </Link>
        </div>

        {botsError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6 text-sm">
            Error loading bots: {botsError.message}
          </div>
        )}

        {bots && bots.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="inline-flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No bots yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Create your first WhatsApp bot to get started
            </p>
            <Link href="/dashboard/bots/new" className="inline-block w-full sm:w-auto">
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Create Your First Bot
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {bots?.map((bot) => (
              <BotCard key={bot.id} bot={bot} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
