# Deploying God's Zeal Xmd to Render

This guide will help you deploy the WhatsApp bot deployment platform to Render with persistent connections for proper Baileys integration.

## Prerequisites

- A GitHub account with your code repository
- A Render account (free tier works)
- Supabase project set up with database
- GitHub OAuth app credentials

## Step 1: Prepare Your Repository

1. Ensure all configuration files are committed:
   - `package.json`
   - `Dockerfile`
   - `render.yaml`
   - All application code

2. Push your code to GitHub:
   \`\`\`bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   \`\`\`

## Step 2: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select your repository from the list

## Step 3: Configure the Web Service

### Basic Settings

- **Name**: `gods-zeal-xmd-platform`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (or specify if in subdirectory)
- **Runtime**: `Docker`
- **Instance Type**: `Starter` (or higher for production)

### Environment Variables

Add the following environment variables in the Render dashboard:

\`\`\`bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database URLs
SUPABASE_POSTGRES_URL=your_postgres_url
SUPABASE_POSTGRES_PRISMA_URL=your_prisma_url
SUPABASE_POSTGRES_URL_NON_POOLING=your_non_pooling_url
SUPABASE_POSTGRES_HOST=your_host
SUPABASE_POSTGRES_DATABASE=your_database
SUPABASE_POSTGRES_USER=your_user
SUPABASE_POSTGRES_PASSWORD=your_password

# Auth
SUPABASE_JWT_SECRET=your_jwt_secret

# Site URLs
NEXT_PUBLIC_SITE_URL=https://your-app.onrender.com
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=https://your-app.onrender.com/auth/callback

# GitHub OAuth (from your GitHub OAuth app)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Node Environment
NODE_ENV=production
\`\`\`

## Step 4: Configure GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: God's Zeal Xmd Platform
   - **Homepage URL**: `https://your-app.onrender.com`
   - **Authorization callback URL**: `https://your-app.onrender.com/auth/github/callback`
4. Copy the Client ID and Client Secret to your Render environment variables

## Step 5: Configure Supabase Authentication

1. In your Supabase project, go to Authentication → URL Configuration
2. Add to **Redirect URLs**:
   - `https://your-app.onrender.com/auth/callback`
   - `https://your-app.onrender.com/auth/github/callback`

## Step 6: Run Database Migrations

After deployment, run the SQL scripts in your Supabase SQL Editor in order:

1. `scripts/001_create_tables.sql`
2. `scripts/002_enable_rls.sql`
3. `scripts/003_create_github_repos_table.sql`
4. `scripts/004_add_admin_settings.sql`
5. `scripts/005_fix_admin_and_schema.sql`
6. `scripts/006_fix_rls_recursion.sql`
7. `scripts/007_add_whatsapp_channel_setting.sql`

## Step 7: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Pull your code
   - Build the Docker image
   - Deploy your application
3. Wait for the build to complete (usually 5-10 minutes)

## Step 8: Configure Admin Settings

1. Log in with the admin email: `godwinhephzibah25@gmail.com`
2. Go to Admin → Settings
3. Configure:
   - GitHub Personal Access Token (with `repo` and `workflow` scopes)
   - Main Bot Repository URL: `https://github.com/AiOfLautech/God-s-Zeal-Xmd`
   - WhatsApp Channel JID (optional)

## Advantages of Render

- **Persistent Connections**: Unlike serverless, Render supports long-running WebSocket connections needed for Baileys
- **Auto-deploys**: Automatically deploys when you push to GitHub
- **Free SSL**: HTTPS included automatically
- **Health Checks**: Automatically monitors your app
- **Logs**: Easy access to application logs
- **Persistent Storage**: Files survive between deployments (when using volumes)

## Troubleshooting

### Build Fails

- Check the build logs in Render dashboard
- Ensure `Dockerfile` is properly configured
- Verify all dependencies in `package.json`

### Environment Variables Not Working

- Double-check all environment variables are set correctly
- Restart the service after updating environment variables

### Pairing Code Not Linking

- Check application logs for Baileys errors
- Ensure the service has been running for at least 2 minutes
- Verify the phone number format includes country code

### Database Connection Issues

- Verify Supabase connection strings are correct
- Check if Supabase project is in the same region
- Ensure RLS policies are set up correctly

## Monitoring

- **Logs**: View in Render Dashboard → Your Service → Logs
- **Metrics**: Monitor CPU, memory usage in the Metrics tab
- **Health**: Render automatically health checks on `/`

## Scaling

To handle more users:

1. Upgrade to a larger instance type
2. Enable auto-scaling in Render settings
3. Consider using Render's Postgres for better database performance

## Cost

- **Free Tier**: Limited resources, sleeps after 15 minutes of inactivity
- **Starter ($7/month)**: Always on, better resources
- **Standard ($25/month)**: Production-ready with auto-scaling

## Support

For issues specific to Render deployment:
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
