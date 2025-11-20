"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Square, RotateCw, Loader2 } from "lucide-react"

interface Bot {
  id: string
  status: string
}

interface BotControlCardProps {
  bot: Bot
}

export function BotControlCard({ bot }: BotControlCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(bot.status)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/bots/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          action: "start",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start bot")
      }

      setCurrentStatus("active")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start bot")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/bots/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          action: "stop",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to stop bot")
      }

      setCurrentStatus("inactive")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop bot")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestart = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/bots/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          action: "restart",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to restart bot")
      }

      setCurrentStatus("active")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart bot")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Controls</CardTitle>
        <CardDescription>Start, stop, or restart your bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={handleStart}
            disabled={isLoading || currentStatus === "active"}
            variant={currentStatus === "active" ? "secondary" : "default"}
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start
          </Button>

          <Button
            onClick={handleStop}
            disabled={isLoading || currentStatus === "inactive"}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            Stop
          </Button>

          <Button
            onClick={handleRestart}
            disabled={isLoading || currentStatus === "inactive"}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Restart
          </Button>
        </div>

        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      </CardContent>
    </Card>
  )
}
