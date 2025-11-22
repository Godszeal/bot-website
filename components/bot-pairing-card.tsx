"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Smartphone, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Bot {
  id: string
  status: string
  phone_number: string | null
  pairing_code: string | null
  is_connected: boolean | null
  connected_at: string | null
}

interface BotPairingCardProps {
  bot: Bot
}

export function BotPairingCard({ bot: initialBot }: BotPairingCardProps) {
  const [bot, setBot] = useState(initialBot)
  const [isPolling, setIsPolling] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isCheckingPairing, setIsCheckingPairing] = useState(false)
  const [isMaintainingConnection, setIsMaintainingConnection] = useState(false)

  useEffect(() => {
    if (bot.status === "pairing" && bot.pairing_code && !isMaintainingConnection) {
      console.log("[v0] 🔄 Starting persistent pairing connection maintenance")
      setIsMaintainingConnection(true)

      // Call maintain-pairing endpoint to keep connection alive
      const maintainConnection = async () => {
        try {
          const response = await fetch(`/api/bots/${bot.id}/maintain-pairing`, {
            method: "POST",
          })

          if (response.ok) {
            const data = await response.json()
            if (data.isPaired) {
              console.log("[v0] ✅ Pairing completed via maintained connection!")
              // Refresh bot status
              const statusResponse = await fetch(`/api/bots/${bot.id}/status`)
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                setBot(statusData.bot)
              }
            } else {
              // Connection timed out, try again
              console.log("[v0] 🔄 Pairing connection timed out, restarting...")
              setTimeout(maintainConnection, 2000)
            }
          }
        } catch (error) {
          console.error("[v0] ❌ Error maintaining pairing:", error)
          setTimeout(maintainConnection, 3000)
        }
      }

      maintainConnection()
    }
  }, [bot.id, bot.status, bot.pairing_code, isMaintainingConnection])

  useEffect(() => {
    if (bot.status === "pairing" || (bot.status === "connected" && !bot.is_connected)) {
      setIsPolling(true)
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/bots/${bot.id}/status`)
          if (response.ok) {
            const data = await response.json()
            setBot(data.bot)

            if (data.bot.is_connected || data.bot.status === "deployed") {
              setIsPolling(false)
              clearInterval(interval)
            }
          }
        } catch (error) {
          console.error("[v0] Error polling bot status:", error)
        }
      }, 5000)

      return () => {
        clearInterval(interval)
        setIsPolling(false)
      }
    }
  }, [bot.id, bot.status, bot.is_connected])

  const handleRegenerateCode = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/bots/${bot.id}/regenerate-code`, {
        method: "POST",
      })

      if (response.ok) {
        setIsPolling(true)
        setBot({ ...bot, pairing_code: null, status: "pairing" })
      }
    } catch (error) {
      console.error("[v0] Error regenerating code:", error)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (bot.is_connected || bot.status === "deployed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">WhatsApp Connection</CardTitle>
          <CardDescription className="text-sm">Your bot is connected and active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
              <p className="text-sm font-medium">Connected Successfully!</p>
              <p className="text-xs text-muted-foreground">{bot.phone_number || "WhatsApp account linked"}</p>
              {bot.connected_at && (
                <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                  Connected {new Date(bot.connected_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (bot.status === "pairing" && bot.pairing_code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">WhatsApp Connection</CardTitle>
          <CardDescription className="text-sm">Link your WhatsApp account with this pairing code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bot.phone_number && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Phone Number</p>
              <p className="text-sm sm:text-base font-medium break-all">{bot.phone_number}</p>
            </div>
          )}

          <div className="p-4 sm:p-6 rounded-lg bg-primary/5 border-2 border-primary/20 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Your Pairing Code</p>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-wider text-primary break-all">
              {bot.pairing_code}
            </p>
            <div className="mt-4 sm:mt-6 space-y-2">
              <p className="text-xs sm:text-sm font-medium">How to link:</p>
              <ol className="text-xs text-muted-foreground text-left space-y-1 max-w-sm mx-auto px-2">
                <li>1. Open WhatsApp on your phone</li>
                <li>2. Go to Settings → Linked Devices</li>
                <li>3. Tap "Link a Device"</li>
                <li>4. Tap "Link with phone number instead"</li>
                <li>5. Enter the code above</li>
              </ol>
            </div>
          </div>

          <Button
            onClick={handleRegenerateCode}
            disabled={isRegenerating}
            variant="outline"
            className="w-full gap-2 text-sm bg-transparent"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Another Code
              </>
            )}
          </Button>

          {isMaintainingConnection && (
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connection active - waiting for you to enter the code on your phone...</span>
            </div>
          )}

          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              The connection is being kept alive. Enter the code on your phone within 60 seconds!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (bot.status === "pairing" && !bot.pairing_code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">WhatsApp Connection</CardTitle>
          <CardDescription className="text-sm">Generating pairing code...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-4">
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Setting up WhatsApp connection...</p>
              <p className="text-xs text-muted-foreground px-4">Your pairing code will appear here in a few seconds</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">WhatsApp Connection</CardTitle>
        <CardDescription className="text-sm">Waiting to generate pairing code</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            The pairing code will be generated automatically when you create the bot. Please wait...
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
