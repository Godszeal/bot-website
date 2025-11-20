"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, User, Mail, Github } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserSettingsFormProps {
  user: {
    email?: string | null
    full_name?: string | null
    avatar_url?: string | null
    github_username?: string | null
  }
}

export function UserSettingsForm({ user }: UserSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    avatar_url: user.avatar_url || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
          <CardDescription className="text-sm">Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                <AvatarImage src={formData.avatar_url || "/placeholder.svg"} alt="Profile" />
                <AvatarFallback>
                  <User className="h-8 w-8 sm:h-10 sm:w-10" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full space-y-2">
                <Label htmlFor="avatar_url" className="text-sm">
                  Avatar URL
                </Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm">
                Full Name
              </Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{user.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {user.github_username && (
              <div className="space-y-2">
                <Label className="text-sm">GitHub Account</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{user.github_username}</span>
                </div>
              </div>
            )}

            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                Settings updated successfully!
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto gap-2 text-sm">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Account Statistics</CardTitle>
          <CardDescription className="text-sm">Your account usage and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Total Bots</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">-</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Active Bots</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">-</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
