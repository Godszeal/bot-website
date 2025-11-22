import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, Globe, Github, ExternalLink } from "lucide-react"

interface Bot {
  id: string
  name: string
  description: string | null
  status: string
  phone_number: string | null
  deployment_url: string | null
  github_repo_url: string | null
  github_repo_name: string | null
  created_at: string
  updated_at: string
}

interface BotInfoCardProps {
  bot: Bot
}

export function BotInfoCard({ bot }: BotInfoCardProps) {
  const statusColors = {
    inactive: "bg-muted text-muted-foreground",
    pairing: "bg-yellow-500/10 text-yellow-500",
    active: "bg-green-500/10 text-green-500",
    deployed: "bg-blue-500/10 text-blue-500",
    error: "bg-destructive/10 text-destructive",
    suspended: "bg-orange-500/10 text-orange-500",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Information</CardTitle>
        <CardDescription>Current status and details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="secondary" className={statusColors[bot.status as keyof typeof statusColors]}>
            {bot.status}
          </Badge>
        </div>

        {bot.phone_number && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              Phone Number
            </div>
            <span className="text-sm font-mono">{bot.phone_number}</span>
          </div>
        )}

        {bot.github_repo_url && (
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Github className="h-4 w-4 text-primary" />
              <span>GitHub Repository</span>
            </div>
            <a
              href={bot.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline group"
            >
              <span className="truncate">{bot.github_repo_name || "View Repository"}</span>
              <ExternalLink className="h-3 w-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        )}

        {bot.deployment_url && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              Deployment
            </div>
            <a
              href={bot.deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View Live
            </a>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Created
          </div>
          <span className="text-sm">{new Date(bot.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
