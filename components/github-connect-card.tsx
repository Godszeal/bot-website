"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, CheckCircle2 } from "lucide-react"

interface Bot {
  id: string
  github_repo_url: string | null
  github_repo_name: string | null
  github_branch: string | null
}

interface GitHubConnectCardProps {
  bot: Bot
}

export function GitHubConnectCard({ bot }: GitHubConnectCardProps) {
  const [repoUrl, setRepoUrl] = useState(bot.github_repo_url || "")
  const [branch, setBranch] = useState(bot.github_branch || "main")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleConnect = async () => {
    if (!repoUrl) {
      setError("Please enter a repository URL")
      return
    }

    setIsConnecting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/bots/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          repoUrl,
          branch,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect repository")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect repository")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDeploy = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const response = await fetch("/api/bots/github/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger deployment")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger deployment")
    } finally {
      setIsConnecting(false)
    }
  }

  if (bot.github_repo_url) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">GitHub Repository</CardTitle>
          <CardDescription className="text-sm">Your bot repository is ready</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Github className="h-5 w-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-green-700">{bot.github_repo_name}</p>
              <p className="text-xs text-green-600">Branch: {bot.github_branch || 'main'}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          </div>

          <a
            href={bot.github_repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-primary hover:underline font-medium"
          >
            View Repository on GitHub →
          </a>
          
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
            ✅ Session credentials uploaded<br/>
            ✅ Deployment workflow configured
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">GitHub Repository</CardTitle>
        <CardDescription className="text-sm">Repository will be created automatically</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <Github className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your bot repository will be automatically forked and configured when you link your WhatsApp device.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
