"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

interface Setting {
  id: string
  setting_key: string
  setting_value: string
  description: string | null
  is_secret: boolean
}

interface AdminSettingsFormProps {
  settings: Setting[]
}

export function AdminSettingsForm({ settings }: AdminSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState<Record<string, string>>(
    settings.reduce(
      (acc, setting) => {
        acc[setting.setting_key] = setting.setting_value
        return acc
      },
      {} as Record<string, string>,
    ),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: formData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings")
      }

      setSuccess(true)
      router.refresh()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">GitHub Configuration</CardTitle>
            <CardDescription className="text-sm">Configure GitHub integration for bot deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings
              .filter((s) => s.setting_key.includes("github") || s.setting_key.includes("bot_repo"))
              .map((setting) => (
                <div key={setting.id} className="space-y-2">
                  <Label htmlFor={setting.setting_key} className="text-sm">
                    {setting.setting_key
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Label>
                  <div className="relative">
                    <Input
                      id={setting.setting_key}
                      type={setting.is_secret && !showSecrets[setting.setting_key] ? "password" : "text"}
                      value={formData[setting.setting_key] || ""}
                      onChange={(e) => setFormData({ ...formData, [setting.setting_key]: e.target.value })}
                      placeholder={setting.description || ""}
                      className={`text-sm ${setting.is_secret ? "pr-10" : ""}`}
                    />
                    {setting.is_secret && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleSecretVisibility(setting.setting_key)}
                      >
                        {showSecrets[setting.setting_key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">WhatsApp Configuration</CardTitle>
            <CardDescription className="text-sm">Configure WhatsApp channel auto-follow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings
              .filter((s) => s.setting_key.includes("whatsapp"))
              .map((setting) => (
                <div key={setting.id} className="space-y-2">
                  <Label htmlFor={setting.setting_key} className="text-sm">
                    {setting.setting_key
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Label>
                  <Input
                    id={setting.setting_key}
                    type="text"
                    value={formData[setting.setting_key] || ""}
                    onChange={(e) => setFormData({ ...formData, [setting.setting_key]: e.target.value })}
                    placeholder={setting.description || ""}
                    className="text-sm"
                  />
                  {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
                </div>
              ))}
          </CardContent>
        </Card>

        {error && <div className="p-3 sm:p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        {success && (
          <div className="p-3 sm:p-4 rounded-lg bg-green-500/10 text-green-500 text-sm">
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
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
