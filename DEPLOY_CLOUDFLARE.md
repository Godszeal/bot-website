# Deploying God's Zeal Xmd to Cloudflare Pages

This guide will help you deploy the WhatsApp bot deployment platform to Cloudflare Pages with Cloudflare Workers for backend functionality.

## Prerequisites

- A GitHub account with your code repository
- A Cloudflare account (free tier works)
- Supabase project set up with database
- GitHub OAuth app credentials

## Important Note

Cloudflare Workers have a 30-second execution timeout, which makes it challenging for Baileys pairing to work reliably. **We recommend using Render for this application** instead.

However, if you still want to use Cloudflare, follow these steps:

## Step 1: Prepare Your Repository

1. Ensure all configuration files are committed:
   - `package.json`
   - `wrangler.toml`
   - All application code

2. Push your code to GitHub:
   \`\`\`bash
   git add .
   git commit -m "Prepare for Cloudflare deployment"
   git push origin main
   \`\`\`

## Step 2: Install Wrangler CLI

\`\`\`bash
npm install -g wrangler
wrangler login
\`\`\`

## Step 3: Configure Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create Application** → **Pages**
4. Connect to your GitHub repository
5. Select your repository

## Step 4: Build Configuration

- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (or your subdirectory)
- **Node version**: `18` or higher

## Step 5: Environment Variables

Add these environment variables in Cloudflare Pages settings:

\`\`\`bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database URLs
SUPABASE_POSTGRES_URL=your_postgres_url

# Site URLs
NEXT_PUBLIC_SITE_URL=https://your-app.pages.dev
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=https://your-app.pages.dev/auth/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Node Environment
NODE_ENV=production
\`\`\`

## Step 6: Configure Cloudflare Workers

For API routes that need longer execution times (like Baileys pairing), you'll need to use Durable Objects:

1. Create a Durable Object for managing Baileys connections:

\`\`\`bash
wrangler publish
\`\`\`

2. Configure bindings in `wrangler.toml`

## Step 7: Deploy

\`\`\`bash
npm run build
wrangler pages deploy .next
\`\`\`

Or push to GitHub, and Cloudflare will auto-deploy.

## Limitations with Cloudflare

1. **30-second timeout**: Workers can only run for 30 seconds, which is often insufficient for Baileys pairing
2. **No persistent file system**: Baileys sessions need persistent storage
3. **WebSocket limitations**: Workers have limited WebSocket support
4. **Cold starts**: Can cause connection issues with Baileys

## Recommended Alternative: Cloudflare + External Worker

If you want to use Cloudflare for the frontend:

1. Deploy the Next.js app to Cloudflare Pages
2. Deploy the Baileys backend to Render or another platform with persistent connections
3. Configure CORS to allow communication between them
4. Update API calls to point to your external backend

## Troubleshooting

### Build Fails

- Check build logs in Cloudflare dashboard
- Ensure Node version is 18 or higher
- Verify all dependencies are installed

### Pairing Code Times Out

- This is expected due to the 30-second worker timeout
- Consider using Render instead for Baileys functionality

### Environment Variables Not Available

- Ensure they're set in both Production and Preview environments
- Redeploy after adding environment variables

## Cost

- **Free Tier**: 100,000 requests/day, 500 builds/month
- **Paid Plans**: $20/month for unlimited builds and more resources

## Why Render is Better for This App

1. **No timeout limits**: Can maintain Baileys connections for minutes
2. **Persistent WebSockets**: Essential for WhatsApp pairing
3. **File system**: Baileys sessions persist properly
4. **Background processes**: Can run keep-alive logic
5. **Simpler deployment**: One-click deploy with Docker

## Recommendation

For God's Zeal Xmd platform, **we strongly recommend deploying to Render** instead of Cloudflare due to the Baileys requirements for persistent WebSocket connections and longer execution times.

See `DEPLOY_RENDER.md` for Render deployment instructions.
