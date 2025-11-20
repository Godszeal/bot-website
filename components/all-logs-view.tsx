"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface BotLog {
  id: string
  level: string
  message: string
  created_at: string
  metadata?: Record<string, unknown>
  bots: {
    id: string
    name: string
  }
}

interface AllLogsViewProps {
  logs: BotLog[]
}

export function AllLogsView({ logs }: AllLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")

  const levelColors = {
    debug: "bg-muted text-muted-foreground",
    info: "bg-blue-500/10 text-blue-500",
    warn: "bg-yellow-500/10 text-yellow-500",
    error: "bg-destructive/10 text-destructive",
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.bots.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = levelFilter === "all" || log.level === levelFilter
    return matchesSearch && matchesLevel
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={levelColors[log.level as keyof typeof levelColors]}>
                    {log.level}
                  </Badge>
                  <Link
                    href={`/dashboard/bots/${log.bots.id}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {log.bots.name}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground">{log.message}</p>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No logs match your filters</div>
      )}
    </div>
  )
}
