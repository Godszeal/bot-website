# God's Zeal Xmd - WhatsApp Bot Deployment Platform

## Overview

God's Zeal Xmd is a comprehensive web platform that enables users to create, deploy, and manage WhatsApp bots using the Baileys library. The platform provides a complete end-to-end solution for bot creation with automated GitHub repository management, real-time pairing via QR codes or pairing codes, and deployment automation through GitHub Actions.

The application serves as a SaaS platform where authenticated users can create multiple WhatsApp bot instances, connect them to their GitHub accounts, monitor bot activity through logs, and manage deployments—all from a centralized dashboard with admin capabilities for platform oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 22, 2025)

**Vercel to Replit Migration Completed**:
- ✅ Fixed critical WhatsApp pairing bug (credentials no longer deleted on connection)
- ✅ Added existing fork detection to prevent duplicate repository errors
- ✅ Configured Next.js for Replit (port 5000, 0.0.0.0 binding)
- ✅ Created comprehensive database migration script (setup_database.sql)
- ✅ Added GitHub OAuth integration guide
- ✅ Updated all redirect URLs for Replit environment
- ✅ Environment variables migrated to Replit secrets
- ✅ Fixed Next.js 16 configuration (serverExternalPackages)

**Deployment Info**:
- Platform running on Replit: https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev
- Supabase Database: https://etjiaukapkfutvgyerim.supabase.co
- GitHub OAuth callback: https://etjiaukapkfutvgyerim.supabase.co/auth/v1/callback

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