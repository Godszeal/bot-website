import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, MoreVertical, Play } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Bot {
  id: string
  name: string
  description: string | null
  status: string
  phone_number: string | null
  deployment_url: string | null
  created_at: string
}

interface BotCardProps {
  bot: Bot
}

export function BotCard({ bot }: BotCardProps) {
  const statusColors = {
    inactive: "bg-muted text-muted-foreground",
    pairing: "bg-yellow-500/10 text-yellow-500",
    active: "bg-green-500/10 text-green-500",
    error: "bg-destructive/10 text-destructive",
    suspended: "bg-orange-500/10 text-orange-500",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl truncate">{bot.name}</CardTitle>
            <CardDescription className="mt-1 text-sm line-clamp-2">
              {bot.description || "No description"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/bots/${bot.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/bots/${bot.id}/settings`}>Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
            <Badge variant="secondary" className={`text-xs ${statusColors[bot.status as keyof typeof statusColors]}`}>
              {bot.status}
            </Badge>
          </div>

          {bot.phone_number && (
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">Phone</span>
              <span className="text-xs sm:text-sm font-mono truncate ml-2">{bot.phone_number}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Link href={`/dashboard/bots/${bot.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent text-xs sm:text-sm">
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                Manage
              </Button>
            </Link>
            {bot.deployment_url && (
              <Button variant="outline" size="sm" className="shrink-0 bg-transparent" asChild>
                <a href={bot.deployment_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
