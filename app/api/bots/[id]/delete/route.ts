import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"
import { cleanupSession, closeConnection } from "@/lib/baileys/connection"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: bot } = await supabase
      .from("bots")
      .select("*, users(github_token)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Close active Baileys connection
    closeConnection(params.id)

    // Clean up session files
    cleanupSession(params.id)

    // If bot has GitHub repository, clean up files and stop workflows
    if (bot.github_repo_url && (bot.users.github_token || process.env.ADMIN_GITHUB_TOKEN)) {
      try {
        const githubToken = bot.users.github_token || process.env.ADMIN_GITHUB_TOKEN
        const octokit = new Octokit({ auth: githubToken })

        const repoFullName = bot.github_repo_name
        if (repoFullName) {
          const [owner, repo] = repoFullName.split("/")

          // Get all workflow runs and cancel them
          try {
            const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
              owner,
              repo,
              status: "in_progress",
            })

            for (const run of runs.workflow_runs) {
              await octokit.actions.cancelWorkflowRun({
                owner,
                repo,
                run_id: run.id,
              })
              console.log("[v0] ✅ Cancelled workflow run:", run.id)
            }
          } catch (error) {
            console.error("[v0] Error cancelling workflows:", error)
          }

          // Delete session file (creds.json)
          try {
            const { data: credsFile } = await octokit.repos.getContent({
              owner,
              repo,
              path: "session/creds.json",
            })

            if ("sha" in credsFile) {
              await octokit.repos.deleteFile({
                owner,
                repo,
                path: "session/creds.json",
                message: "Remove bot session credentials",
                sha: credsFile.sha,
              })
              console.log("[v0] ✅ Deleted creds.json from repository")
            }
          } catch (error) {
            console.error("[v0] Error deleting creds.json:", error)
          }

          // Delete workflow file
          try {
            const { data: workflowFile } = await octokit.repos.getContent({
              owner,
              repo,
              path: ".github/workflows/deploy.yml",
            })

            if ("sha" in workflowFile) {
              await octokit.repos.deleteFile({
                owner,
                repo,
                path: ".github/workflows/deploy.yml",
                message: "Remove deployment workflow",
                sha: workflowFile.sha,
              })
              console.log("[v0] ✅ Deleted workflow file from repository")
            }
          } catch (error) {
            console.error("[v0] Error deleting workflow:", error)
          }
        }
      } catch (error) {
        console.error("[v0] Error cleaning up GitHub repository:", error)
      }
    }

    // Delete bot from database
    const { error: deleteError } = await supabase.from("bots").delete().eq("id", params.id)

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete bot" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting bot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
