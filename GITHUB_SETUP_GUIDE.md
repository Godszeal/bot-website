# GitHub Integration Setup Guide

This guide will help you set up GitHub OAuth and repository forking for the God's Zeal Xmd platform.

## Prerequisites
- Admin access to your Supabase project
- A GitHub account

## Step 1: Run Database Migrations

1. Go to your Supabase dashboard: https://etjiaukapkfutvgyerim.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy all the contents of `setup_database.sql` file
5. Paste into the SQL editor
6. Click "Run" to execute the migration
7. Verify all tables are created successfully

## Step 2: Create GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click on "OAuth Apps" in the left sidebar
3. Click "New OAuth App"
4. Fill in the details:
   - **Application name**: God's Zeal Xmd Platform
   - **Homepage URL**: `https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev`
   - **Authorization callback URL**: `https://etjiaukapkfutvgyerim.supabase.co/auth/v1/callback`
5. Click "Register application"
6. Copy the **Client ID** and **Client Secret** (you'll need these for Supabase)

## Step 3: Configure Supabase with GitHub OAuth

1. Go to your Supabase dashboard
2. Navigate to "Authentication" → "Providers"
3. Find "GitHub" and click to enable it
4. Enter your **Client ID** and **Client Secret** from Step 2
5. Make sure "GitHub enabled" is toggled ON
6. Save the settings

## Step 4: Create GitHub Personal Access Token (for Repository Operations)

This token is used by the platform admin to automatically fork the main repository for users.

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Fill in the details:
   - **Note**: God's Zeal Xmd Platform - Repo Forking
   - **Expiration**: No expiration (or choose your preference)
   - **Scopes**: Select these permissions:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
     - ✅ `admin:repo_hook` (Full control of repository hooks)
4. Click "Generate token"
5. **IMPORTANT**: Copy the token immediately (you won't see it again!)

## Step 5: Add GitHub Token to Admin Settings

You have two options:

### Option A: Using the Admin Dashboard (Recommended)
1. Log in to your platform: https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev
2. Make sure you're logged in with the admin email: `godwinhephzibah25@gmail.com`
3. Go to Admin → Settings
4. Find "GitHub Token" setting
5. Paste your Personal Access Token
6. Save

### Option B: Using SQL Editor (Alternative)
1. Go to Supabase SQL Editor
2. Run this query (replace YOUR_TOKEN_HERE with your actual token):

\`\`\`sql
UPDATE public.admin_settings 
SET setting_value = 'YOUR_TOKEN_HERE'
WHERE setting_key = 'github_token';
\`\`\`

## Step 6: Update Redirect URLs in Environment

The platform is already configured with the correct Replit URL:
- Site URL: `https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev`

This is set in your environment variables and used for GitHub callbacks.

## How It Works

### User Login Flow:
1. User clicks "Continue with GitHub" on login page
2. GitHub OAuth redirects to Supabase
3. Supabase authenticates and stores the user's **GitHub OAuth token**
4. User is redirected to dashboard
5. User's GitHub token is stored in `users.github_token` column

### Bot Creation Flow:
1. User creates a new bot
2. Platform checks if user has GitHub token (from OAuth login)
3. If user has a token, it uses **user's token** to:
   - Fork the main repository (`AiOfLautech/God-s-Zeal-Xmd`) to user's GitHub account
   - Create session folder in forked repo
   - Create GitHub Actions workflow for deployment
   - Star the original repository (optional)
4. If user doesn't have a token, it uses **admin token** as fallback

### Repository Features:
- **Automatic forking**: Each user gets their own fork
- **Session storage**: WhatsApp credentials stored in forked repo
- **GitHub Actions**: Automatic deployment workflow created
- **Existing fork detection**: Checks if user already has a fork before creating new one

## Testing the Setup

1. **Test Login**:
   - Go to: https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev/auth/login
   - Click "Continue with GitHub"
   - You should be redirected to GitHub
   - Authorize the app
   - You should be redirected to dashboard

2. **Test Bot Creation**:
   - Create a new bot
   - Check if repository is forked to your GitHub account
   - Verify workflow file is created at `.github/workflows/deploy.yml`

## Troubleshooting

### "Unauthorized" error on login:
- Check that GitHub OAuth is enabled in Supabase
- Verify Client ID and Client Secret are correct
- Check that callback URL matches exactly

### Bot creation fails to fork repository:
- Verify admin GitHub token is set in admin_settings
- Check token has `repo` and `workflow` scopes
- Ensure token hasn't expired

### Database errors:
- Make sure all migrations from setup_database.sql ran successfully
- Check Row Level Security policies are in place
- Verify user has proper admin access

## Security Notes

- GitHub tokens are stored as secrets in the database
- User tokens are used for their own operations (better security)
- Admin token is only used as fallback
- All tokens are encrypted at rest by Supabase
- Row Level Security ensures users can only access their own data

## Support

If you encounter any issues, check the server logs for detailed error messages.
