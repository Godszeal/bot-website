"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Github, Trash2, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

interface Bot {
  id: string
  name: string
}

interface BotActionsCardProps {
  bot: Bot
}

export function BotActionsCard({ bot }: BotActionsCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${bot.name}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("bots").delete().eq("id", bot.id)

      if (error) throw error

      router.push("/dashboard")
    } catch (error) {
      console.error("Error deleting bot:", error)
      alert("Failed to delete bot")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Manage your bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href={`/dashboard/bots/${bot.id}/settings`} className="block">
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Bot Settings
          </Button>
        </Link>

        <Link href={bot.github_repo_url || `https://github.com/${bot.github_repo_name || ''}`} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <Github className="h-4 w-4" />
            View on GitHub
          </Button>
        </Link>

        <Button variant="destructive" className="w-full gap-2" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete Bot"}
        </Button>
      </CardContent>
    </Card>
  )
}
