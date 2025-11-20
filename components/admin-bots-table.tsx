"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Ban } from "lucide-react"
import Link from "next/link"

interface Bot {
  id: string
  name: string
  status: string
  phone_number: string | null
  created_at: string
  users: {
    email: string
    full_name: string | null
  }
}

interface AdminBotsTableProps {
  bots: Bot[]
}

export function AdminBotsTable({ bots }: AdminBotsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const statusColors = {
    inactive: "bg-muted text-muted-foreground",
    pairing: "bg-yellow-500/10 text-yellow-500",
    active: "bg-green-500/10 text-green-500",
    error: "bg-destructive/10 text-destructive",
    suspended: "bg-orange-500/10 text-orange-500",
  }

  const filteredBots = bots.filter(
    (bot) =>
      bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bot.users.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSuspendBot = async (botId: string) => {
    if (!confirm("Are you sure you want to suspend this bot?")) {
      return
    }

    try {
      const response = await fetch("/api/admin/bots/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId }),
      })

      if (!response.ok) {
        throw new Error("Failed to suspend bot")
      }

      window.location.reload()
    } catch (error) {
      console.error("Error suspending bot:", error)
      alert("Failed to suspend bot")
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search bots..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bot Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBots.map((bot) => (
              <TableRow key={bot.id}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/bots/${bot.id}`} className="hover:text-primary transition-colors">
                    {bot.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{bot.users.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{bot.users.email}</p>
                  </div>
                </TableCell>
                <TableCell>{bot.phone_number || "-"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[bot.status as keyof typeof statusColors]}>
                    {bot.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(bot.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="icon" onClick={() => handleSuspendBot(bot.id)} title="Suspend bot">
                    <Ban className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredBots.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No bots match your search</div>
      )}
    </div>
  )
}
