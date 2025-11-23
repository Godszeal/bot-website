# Package Lock File Guide

## For Main Repository (God's-Zeal-Xmd)

To fix the GitHub Actions workflow error about missing `package-lock.json`, follow these steps:

### Option 1: Generate package-lock.json automatically (Recommended)

1. Clone your main repository:
   \`\`\`bash
   git clone https://github.com/AiOfLautech/God-s-Zeal-Xmd.git
   cd God-s-Zeal-Xmd
   \`\`\`

2. Delete any existing `node_modules` folder:
   \`\`\`bash
   rm -rf node_modules
   \`\`\`

3. Generate fresh package-lock.json:
   \`\`\`bash
   npm install
   \`\`\`

4. Commit and push the package-lock.json file:
   \`\`\`bash
   git add package-lock.json
   git commit -m "Add package-lock.json for npm caching"
   git push origin main
   \`\`\`

### Option 2: Use the provided template

If you can't generate the lock file locally, you can use the `package-lock-template.json` file provided in this repository:

1. Copy the contents of `package-lock-template.json`
2. Create a new file named `package-lock.json` in your main repository root
3. Paste the contents
4. Commit and push:
   \`\`\`bash
   git add package-lock.json
   git commit -m "Add package-lock.json for npm caching"
   git push origin main
   \`\`\`

## How the Platform Handles It

The deployment platform now automatically:

1. **Creates package-lock.json** when forking your repository
2. **Uploads it alongside creds.json** to the session folder
3. **Updates the workflow** to handle both scenarios:
   - If `package-lock.json` exists → uses `npm ci` (faster, more reliable)
   - If missing → falls back to `npm install`

## Workflow Improvements

The updated workflow now:

- ✅ Checks for package-lock.json before deciding install method
- ✅ Prevents infinite bot restarts with 1-hour timeout
- ✅ Handles missing lock files gracefully
- ✅ Uses Node.js 20 for better compatibility

## Verification

After pushing the package-lock.json file to your main repository, the platform will:

1. Fork your repository
2. Upload the session credentials
3. Create/update the workflow
4. Start the bot automatically via GitHub Actions

All future bot deployments will use the lock file for faster, more reliable installations.
