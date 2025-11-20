import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot, Github, Zap, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-base sm:text-lg md:text-xl font-bold">God's Zeal Xmd</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                Login
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="text-xs sm:text-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Deploy WhatsApp Bots in Minutes
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground text-pretty px-4">
            The easiest way to deploy and manage your WhatsApp bots using Baileys. Connect, deploy, and monitor all from
            one dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 px-4">
            <Link href="/auth/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto text-sm sm:text-base">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                Start Deploying
              </Button>
            </Link>
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 bg-transparent w-full sm:w-auto text-sm sm:text-base"
              >
                <Github className="h-4 w-4 sm:h-5 sm:w-5" />
                Login with GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="p-4 sm:p-6 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Easy Pairing</h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Generate pairing codes instantly and connect your WhatsApp account with just a few clicks.
            </p>
          </div>
          <div className="p-4 sm:p-6 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <Github className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2">GitHub Integration</h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Automatically fork repositories and deploy your bots using GitHub Actions.
            </p>
          </div>
          <div className="p-4 sm:p-6 rounded-lg border border-border bg-card sm:col-span-2 lg:col-span-1">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Your credentials are encrypted and stored securely. Monitor your bots with live logs.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border mt-12 sm:mt-16 md:mt-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2025 God's Zeal Xmd. Built with Baileys and Next.js.</p>
        </div>
      </footer>
    </div>
  )
}
