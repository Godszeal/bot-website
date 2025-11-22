"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface BotLog {
  id: string
  level: string
  message: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface BotLogsCardProps {
  botId: string
  initialLogs: BotLog[]
}

export function BotLogsCard({ botId, initialLogs }: BotLogsCardProps) {
  const [logs, setLogs] = useState<BotLog[]>(initialLogs)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const levelColors = {
    debug: "bg-muted text-muted-foreground",
    info: "bg-blue-500/10 text-blue-500",
    warn: "bg-yellow-500/10 text-yellow-500",
    error: "bg-destructive/10 text-destructive",
  }

  const fetchLogs = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/bots/${botId}/logs`)
      const data = await response.json()
      if (response.ok) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    // Auto-refresh logs every 5 seconds
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [botId])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Logs</CardTitle>
            <CardDescription>Real-time bot activity and errors</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No logs yet. Logs will appear here when your bot is active.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border border-border bg-card text-sm">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Badge variant="secondary" className={levelColors[log.level as keyof typeof levelColors]}>
                    {log.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-foreground">{log.message}</p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
