import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitCommit, Clock } from "lucide-react"
import Link from "next/link"

interface Deployment {
  id: string
  bot_id: string
  status: string
  commit_sha: string | null
  commit_message: string | null
  started_at: string
  completed_at: string | null
  bots: {
    id: string
    name: string
  }
}

interface DeploymentsListProps {
  deployments: Deployment[]
}

export function DeploymentsList({ deployments }: DeploymentsListProps) {
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500",
    building: "bg-blue-500/10 text-blue-500",
    deploying: "bg-purple-500/10 text-purple-500",
    success: "bg-green-500/10 text-green-500",
    failed: "bg-destructive/10 text-destructive",
  }

  return (
    <div className="space-y-4">
      {deployments.map((deployment) => (
        <Card key={deployment.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  <Link href={`/dashboard/bots/${deployment.bot_id}`} className="hover:text-primary transition-colors">
                    {deployment.bots.name}
                  </Link>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <GitCommit className="h-3 w-3" />
                  {deployment.commit_message || "No commit message"}
                </CardDescription>
              </div>
              <Badge variant="secondary" className={statusColors[deployment.status as keyof typeof statusColors]}>
                {deployment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Started {new Date(deployment.started_at).toLocaleString()}</span>
              {deployment.completed_at && <span>• Completed {new Date(deployment.completed_at).toLocaleString()}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
