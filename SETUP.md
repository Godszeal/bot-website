# WhatsApp Bot Deployment Platform - Setup Guide

This guide will help you set up the WhatsApp bot deployment platform with Baileys integration, GitHub OAuth, and automated bot deployment.

## Prerequisites

- Supabase account (already connected)
- GitHub account
- GitHub Personal Access Token
- GitHub OAuth App credentials

## Step 1: Run Database Scripts

Execute the SQL scripts in order to set up your database:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each script in the `scripts/` folder in order:
   - `001_create_tables.sql`
   - `002_enable_rls.sql`
   - `003_create_user_trigger.sql`
   - `004_add_admin_settings.sql`
   - `005_fix_admin_and_schema.sql`

## Step 2: Set Up GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: WhatsApp Bot Deployer
   - **Homepage URL**: `https://your-domain.vercel.app` (or your deployment URL)
   - **Authorization callback URL**: `https://your-domain.vercel.app/auth/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Generate a new **Client Secret** and copy it

## Step 3: Configure Supabase Authentication

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Providers
3. Enable GitHub provider
4. Paste your GitHub OAuth **Client ID** and **Client Secret**
5. Save the configuration

## Step 4: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Bot Deployment Platform"
4. Select scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. Copy the token (you won't see it again!)

## Step 5: Configure Admin Settings

1. Log in to the platform with the admin email: `godwinhephzibah25@gmail.com`
2. Go to Admin → Settings
3. Fill in the following settings:
   - **GitHub Token**: Paste your Personal Access Token
   - **Main Bot Repo**: `https://github.com/AiOfLautech/God-s-Zeal-Xmd` (already set)
   - **Main Bot Repo Owner**: `AiOfLautech` (already set)
   - **Main Bot Repo Name**: `God-s-Zeal-Xmd` (already set)
4. Click "Save Settings"

## Step 6: Environment Variables

The following environment variables are automatically configured through Supabase integration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

No additional environment variables are needed!

## How It Works

### Bot Creation Flow

1. **User creates a bot**: User fills in bot name, description, and phone number
2. **Baileys connection starts**: The backend immediately creates a WhatsApp connection using Baileys
3. **Pairing code generated**: Within 3 seconds, a pairing code is generated and displayed to the user
4. **User links device**: User enters the pairing code in WhatsApp (Settings → Linked Devices → Link a Device)
5. **Session saved**: Once linked, the session credentials (creds.json) are automatically saved
6. **Repository forked**: The main bot repository is forked to the user's GitHub account (or admin's if user didn't use GitHub OAuth)
7. **Session uploaded**: The creds.json file is uploaded to the forked repository's `session/` folder
8. **Workflow created**: A GitHub Actions workflow is created to deploy and run the bot
9. **Welcome message sent**: The bot sends a welcome message to the user's WhatsApp
10. **Bot deployed**: The bot is now running in GitHub Actions!

### GitHub OAuth Flow

When users sign up or log in with GitHub:
- Their GitHub access token is automatically captured and stored
- This token is used to fork repositories under their account
- They can manage their bots directly from their GitHub account

When users sign up with email/password:
- The admin's GitHub token is used to fork repositories
- Bots are forked under the admin's account

### Admin Features

Admins can:
- View all users and bots
- Suspend/unsuspend bots
- Delete users
- Configure platform settings
- Monitor system-wide activity

## Troubleshooting

### Pairing code not appearing
- Check the bot status in the database
- Look at the server logs for Baileys errors
- Ensure the phone number is in correct format (with country code)

### Repository not forking
- Verify the GitHub token has correct permissions
- Check that the main bot repository URL is correct
- Ensure the token hasn't expired

### Bot not connecting
- Verify the pairing code was entered correctly
- Check that WhatsApp is up to date
- Ensure the phone number matches the one used for pairing

## Security Notes

- GitHub tokens are stored encrypted in the database
- Session credentials are only accessible to the bot owner
- RLS policies protect all user data
- Admin access is restricted to verified admin emails

## Support

For issues or questions, contact the platform administrator.
