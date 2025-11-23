"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Bot, Github } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: "https://etjiaukapkfutvgyerim.supabase.co/auth/v1/callback",
          scopes: "repo workflow",
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
            <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold">BotDeploy</span>
          </div>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl">Login</CardTitle>
              <CardDescription className="text-sm">Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4 sm:gap-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 bg-transparent"
                    onClick={handleGithubLogin}
                    disabled={isLoading}
                  >
                    <Github className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Continue with GitHub</span>
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-sm">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-sm sm:text-base"
                    />
                  </div>
                  {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full text-sm sm:text-base" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-xs sm:text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
