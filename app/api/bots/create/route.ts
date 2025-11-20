      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start bot
        run: npm start
        env:
          NODE_ENV: production
`

    await octokit.repos.createOrUpdateFileContents({
      owner: fork.owner.login,
      repo: fork.name,
      path: ".github/workflows/deploy.yml",
      message: "Add deployment workflow",
      content: Buffer.from(workflowContent).toString("base64"),
    })

    console.log("[v0] Workflow created successfully")

    // Update bot with repo info
    await supabase
      .from("bots")
      .update({
        github_repo_url: fork.html_url,
        github_repo_name: fork.full_name,
        github_branch: fork.default_branch,
        status: "deployed",
        last_deployed_at: new Date().toISOString(),
      })
      .eq("id", botId)

    console.log("[v0] Bot deployed successfully:", fork.html_url)
  } catch (error) {
    console.error("[v0] Error forking and deploying:", error)
    await supabase
      .from("bots")
      .update({
        status: "error",
      })
      .eq("id", botId)
  }
}
