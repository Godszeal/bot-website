"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Github, Trash2, Settings, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface Bot {
  id: string
  name: string
  github_repo_url: string | null
  github_repo_name: string | null
}

interface BotActionsCardProps {
  bot: Bot
}

export function BotActionsCard({ bot }: BotActionsCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isGitHubConnected, setIsGitHubConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/github/connect")
        const data = await response.json()
        setIsGitHubConnected(data.connected)
      } catch (error) {
        console.error("[v0] Error checking GitHub connection:", error)
      } finally {
        setIsCheckingConnection(false)
      }
    }

    checkConnection()
  }, [])

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${bot.name}? This will stop all workflows and remove session data from GitHub.`,
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bots/${bot.id}/delete`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete bot")
      }

      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Error deleting bot:", error)
      alert("Failed to delete bot")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConnectGitHub = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/github/connect", {
        method: "POST",
      })

      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else if (data.connected) {
        setIsGitHubConnected(true)
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] Error connecting GitHub:", error)
      alert("Failed to connect GitHub")
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Actions</CardTitle>
        <CardDescription className="text-sm">Manage your bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href={`/dashboard/bots/${bot.id}/settings`} className="block">
          <Button variant="outline" className="w-full gap-2 bg-transparent text-sm sm:text-base">
            <Settings className="h-4 w-4" />
            Bot Settings
          </Button>
        </Link>

        {bot.github_repo_url ? (
          <Link href={bot.github_repo_url} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full gap-2 bg-transparent text-sm sm:text-base">
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 bg-transparent text-sm sm:text-base"
            onClick={handleConnectGitHub}
            disabled={isConnecting || isCheckingConnection}
          >
            {isCheckingConnection ? (
              <>
                <Github className="h-4 w-4 animate-pulse" />
                Checking...
              </>
            ) : isGitHubConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                GitHub Connected
              </>
            ) : isConnecting ? (
              <>
                <Github className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="h-4 w-4" />
                Connect GitHub
              </>
            )}
          </Button>
        )}

        <Button
          variant="destructive"
          className="w-full gap-2 text-sm sm:text-base"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete Bot"}
        </Button>
      </CardContent>
    </Card>
  )
}
