import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Bot, Activity, Rocket } from "lucide-react"

interface AdminStatsCardsProps {
  totalUsers: number
  totalBots: number
  activeBots: number
  totalDeployments: number
}

export function AdminStatsCards({ totalUsers, totalBots, activeBots, totalDeployments }: AdminStatsCardsProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Bots</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBots}</div>
          <p className="text-xs text-muted-foreground mt-1">Created bots</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeBots}</div>
          <p className="text-xs text-muted-foreground mt-1">Currently running</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Deployments</CardTitle>
          <Rocket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDeployments}</div>
          <p className="text-xs text-muted-foreground mt-1">Total deployments</p>
        </CardContent>
      </Card>
    </div>
  )
}
