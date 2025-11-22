# God's Zeal Xmd - WhatsApp Bot Deployment Platform

## Overview

God's Zeal Xmd is a comprehensive web platform that enables users to create, deploy, and manage WhatsApp bots using the Baileys library. The platform provides a complete end-to-end solution for bot creation with automated GitHub repository management, real-time pairing via QR codes or pairing codes, and deployment automation through GitHub Actions.

The application serves as a SaaS platform where authenticated users can create multiple WhatsApp bot instances, connect them to their GitHub accounts, monitor bot activity through logs, and manage deployments—all from a centralized dashboard with admin capabilities for platform oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 22, 2025)

**Repository Access System Added** (NEW):
- ✅ Users with GitHub account automatically added as collaborators to admin-forked repos
- ✅ Repository links displayed in bot dashboard ("Bot Information" section)
- ✅ Full repository URL sent via WhatsApp after deployment
- ✅ Different access messages based on user's GitHub status
- ✅ "maintain" permission level for collaborators (can edit and push code)

**Fixed "Failed to Fetch" Errors** (FIXED):
- ✅ Added `runtime = "nodejs"` to status endpoint
- ✅ Improved error handling in bot-logs-card component
- ✅ Improved error handling in bot-pairing-card component
- ✅ Better error messages for network/server failures
- ✅ All API endpoints now properly configured for runtime environment

**Admin Token Fallback for Non-GitHub Users** (PREVIOUS):
- ✅ Users without GitHub login can now deploy bots using admin token
- ✅ Admin can configure GitHub token in admin settings dashboard
- ✅ Automatic fallback: user token → admin token → error
- ✅ Fork created under token owner's account (user's if available, else admin's)
- ✅ Workflow and credentials files automatically created in forked repo
- ✅ Proper error messages if no token is available
- ✅ Enhanced logging shows which token source was used

**Complete File Rewrite & Connection Status Messages** (FIXED):
- ✅ Fixed "Failed to fetch" error in logs endpoint - Added `runtime = "nodejs"` configuration
- ✅ Fixed repository files NOT being created - Fixed github_username fetching bug
- ✅ Fixed credentials file timing issue - Added delay to ensure files written to disk
- ✅ Added fallback creds from socket state if file not found
- ✅ **Added real-time WhatsApp status messages during bot connection lifecycle**
- ✅ Bot sends "🔗 Connecting..." message when connecting
- ✅ Bot sends "📦 Creating Repository Files..." during deployment setup
- ✅ Bot sends "🚀 Deployment Started" when creating GitHub fork
- ✅ Bot sends full deployment success message with repository URL when complete
- ✅ Bot sends error messages if connection or deployment fails
- ✅ Added logout detection and messaging
- ✅ Enhanced error handling throughout entire connection flow
- ✅ Improved logging for debugging and monitoring

**Repository File Auto-Regeneration System**:
- ✅ Automatic detection of missing repository files (creds.json, workflows)
- ✅ Auto-recreates missing files when bot connects (no manual intervention needed)
- ✅ New endpoint: `POST /api/bots/[id]/regenerate-files` for manual regeneration
- ✅ Users can delete all repository files and they'll be automatically recreated
- ✅ Works for both new bots and existing deployed bots
- ✅ Prevents "files not found" errors

**Bot Deletion & Cleanup Enhanced**:
- ✅ Graceful disconnect of active Baileys connections when bot is deleted
- ✅ All running workflows/timers stopped (keep-alive, pairing timers)
- ✅ Session files (creds.json) and entire session directory completely cleared
- ✅ Bot logs automatically deleted on bot removal
- ✅ Deployment history cleared
- ✅ Clean database removal with cascade deletes

**GitHub OAuth Redirect URL Fixed**:
- ✅ Now uses deployment URL (`NEXT_PUBLIC_SITE_URL`) instead of localhost
- ✅ Updated login page GitHub OAuth redirect
- ✅ Updated sign-up page GitHub OAuth redirect
- ✅ Fallback to window.location.origin for local development
- ✅ Proper environment-aware configuration across all auth flows

**Bot Status Updates on New Link**:
- ✅ Status updates when device successfully links (pairing → active → deployed)
- ✅ Proper tracking of connection state through maintain-pairing endpoint
- ✅ Database updates reflect current bot state in real-time

**Connection Workflow Fixed** (Previous):
- ✅ Fixed endless reconnection loop - bot no longer reconnects after pairing completes
- ✅ Connection success message now sent IMMEDIATELY when device links (before deployment)
- ✅ Fork and deploy moved from create route to maintain-pairing endpoint
- ✅ Only one connection instance created during pairing phase
- ✅ Repository notification sent AFTER successful deployment
- ✅ Bot status properly tracked: pairing → active → deployed → stopped

**Previous Fixes Applied**:
- ✅ Fixed critical WhatsApp pairing bug (credentials no longer deleted on connection)
- ✅ Added existing fork detection to prevent duplicate repository errors
- ✅ Configured Next.js for Replit (port 5000, 0.0.0.0 binding)
- ✅ Fixed hydration mismatches (date formatting in timestamps)
- ✅ Fixed GitHub Actions workflow (removed npm cache requirement for package-lock.json)
- ✅ Fixed Radix UI button ID mismatches with suppressHydrationWarning

**Bot Lifecycle Management**:
- ✅ Bot deletion endpoint (`POST /api/bots/[id]/delete`) - removes bot and its session files
- ✅ Resend connection message endpoint (`POST /api/bots/[id]/resend-connection-message`) - allows users to resend WhatsApp connection confirmations
- ✅ Proper session cleanup when bots are deleted
- ✅ Session files auto-cleanup on disconnect

**Deployment Info**:
- Platform running on Replit: https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev
- Supabase Database: https://etjiaukapkfutvgyerim.supabase.co
- GitHub OAuth callback: https://etjiaukapkfutvgyerim.supabase.co/auth/v1/callback

## Setup Instructions for Admin GitHub Token

### For Users Without GitHub Login
If a user hasn't logged in with their GitHub account, the system will automatically use the **Admin GitHub Token** to fork and deploy repositories. This allows any user to deploy bots without needing their own GitHub account.

### How to Configure Admin GitHub Token

**Option 1: Set via Admin Settings Dashboard** (Recommended)
1. Login as admin user
2. Go to `/admin/settings`
3. Add or update the `github_token` setting with your GitHub Personal Access Token
4. The token will be used for all users who don't have their own GitHub login

**Option 2: Direct Database Insert**
```sql
INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('github_token', 'ghp_xxxxxxxxxxxxxxxxxxxxx')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'ghp_xxxxxxxxxxxxxxxxxxxxx';
```

### Repository Access System (NEW)

**For Users WITH GitHub Account** (even if they didn't login with it):
- ✅ Fork created under admin's account
- ✅ User **automatically added as collaborator** with "maintain" access
- ✅ User can view, edit, and push code to the repository
- ✅ User receives confirmation in WhatsApp message that they've been added
- ✅ Repository link displayed in bot dashboard for easy access

**For Users WITHOUT GitHub Account**:
- ✅ Fork created under admin's account  
- ✅ Admin must manually grant user access or share the repository link
- ✅ User receives WhatsApp message with instructions to ask admin for access
- ✅ Repository link displayed in bot dashboard

**All Users Get**:
- ✅ Repository link in WhatsApp deployment message
- ✅ Repository link in bot dashboard ("Bot Information" section)
- ✅ Full GitHub repository access after deployment

### Getting a GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token"
3. Select scopes: `repo`, `workflow`
4. Copy the token and save it securely
5. Add it to admin settings in your platform

## System Architecture

### Frontend Architecture

**Framework**: Next.js 16 with React 19 using the App Router pattern
- Server-side rendering for optimal performance and SEO
- Client components for interactive features (forms, real-time updates)
- Dark theme as default with TailwindCSS v4 for styling
- shadcn/ui component library (New York style) for consistent UI
- Responsive design with mobile-first approach

**Key Design Patterns**:
- Server Components by default for data fetching and static content
- Client Components ('use client') only where interactivity is required
- Separation of concerns: components organized by feature (admin, bot management, UI primitives)
- API routes handle all backend logic and database operations

### Backend Architecture

**Runtime**: Node.js via Next.js API Routes
- API routes located in `/app/api/` directory
- Node.js runtime explicitly specified for routes requiring Baileys integration
- Dynamic route handlers with configurable execution timeouts (up to 60 seconds for pairing operations)
- RESTful API design pattern

**Authentication & Authorization**:
- Supabase Auth with GitHub OAuth as primary authentication method
- Row Level Security (RLS) policies enforce data access controls at database level
- User roles: standard users and admins (is_admin flag)
- Middleware validates sessions and handles authentication redirects
- GitHub Personal Access Tokens stored securely for repository automation

**WhatsApp Integration** (Baileys):
- File-based session management in `/tmp/baileys_sessions/`
- Pairing code generation for linking WhatsApp accounts
- Connection state management with in-memory tracking
- Keep-alive timers to maintain active connections during pairing
- QR code fallback option for pairing
- Session persistence for reconnection after restarts (credentials NOT deleted on reconnect)
- Fixed bug: Previously deleted creds.json on every connection, causing devices to disconnect

**GitHub Integration** (Octokit):
- Automated repository forking with existing fork detection
- GitHub Actions workflow deployment
- Commit management and branch operations
- OAuth token-based authentication for API access
- User's GitHub OAuth token used first (from login)
- Admin token as fallback for users without GitHub connection
- Checks for existing forks before creating new ones (prevents duplicate fork errors)

### Data Storage

**Primary Database**: Supabase (PostgreSQL)

**Schema Design**:
- `users`: User profiles with GitHub integration, admin flags
- `bots`: Bot instances with status tracking, pairing information, session data
- `deployments`: Deployment history with GitHub commit references
- `bot_logs`: Activity logs with level-based filtering (debug, info, warn, error)
- `admin_settings`: Platform-wide configuration (API keys, secrets)

**Data Access Patterns**:
- Row Level Security policies ensure users only access their own resources
- Admin users bypass RLS for oversight capabilities
- Trigger-based automatic user profile creation on signup
- Cascade deletes maintain referential integrity

**File Storage**:
- Session files stored in `/tmp` directory (ephemeral on serverless)
- Production deployments should use persistent storage solutions

### External Dependencies

**Supabase Services**:
- PostgreSQL database with RLS
- Authentication (email/password and GitHub OAuth)
- Real-time subscriptions (available but not currently used)
- Server-side API clients via `@supabase/ssr`

**WhatsApp Integration**:
- `@whiskeysockets/baileys`: WhatsApp Web API library
- `@hapi/boom`: Error handling for Baileys
- `pino`: Logging for connection state
- `audio-decode`: Media processing support

**GitHub Integration**:
- `@octokit/rest`: GitHub API client for repository automation
- GitHub OAuth App credentials for user authentication
- GitHub Personal Access Tokens for automated deployments

**UI & Styling**:
- `@radix-ui/*`: Accessible UI primitives
- TailwindCSS v4 with OKLCH color space
- `class-variance-authority`: Component variant management
- `lucide-react`: Icon library
- `@vercel/analytics`: Usage analytics

**Deployment Considerations**:
- Designed for Render deployment (persistent connections required for Baileys)
- Cloudflare Workers not recommended due to 30-second timeout limitations
- Docker support via Dockerfile
- Environment variables for all sensitive configuration

**API Constraints**:
- Baileys requires persistent connections during pairing (30-60 seconds)
- GitHub API rate limits apply (authenticated: 5000 req/hour)
- Supabase connection pooling for database access
- File-based sessions require persistent storage in production
