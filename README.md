# God's Zeal Xmd - WhatsApp Bot Deployment Platform

A comprehensive platform for deploying and managing WhatsApp bots using Baileys library with automated GitHub deployment.

## Features

- 🤖 **Instant Bot Creation** - Create WhatsApp bots with just a name and phone number
- 🔐 **GitHub OAuth Integration** - Sign up/login with GitHub for seamless repository management
- 📱 **Real-time Pairing** - Generate pairing codes instantly using Baileys
- 🚀 **Automated Deployment** - Automatically fork, configure, and deploy bots to GitHub Actions
- 📊 **Admin Dashboard** - Comprehensive admin panel for user and bot management
- 🔒 **Secure by Default** - Row Level Security (RLS) policies protect all user data
- 📝 **Live Logs** - View real-time logs from your bot deployments
- ⚡ **Dark Theme** - Beautiful dark-themed interface

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS v4
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with GitHub OAuth
- **WhatsApp Integration**: @whiskeysockets/baileys
- **Deployment**: GitHub Actions, Render
- **Version Control**: GitHub API via Octokit

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account
- GitHub account
- GitHub Personal Access Token

### 2. Installation

\`\`\`bash
# Clone the repository
git clone <your-repo-url>
cd bot-deployment-platform

# Install dependencies
npm install

# Run database migrations (see SETUP.md)
# Configure admin settings (see SETUP.md)

# Start development server
npm run dev
\`\`\`

### 3. Configuration

See [SETUP.md](./SETUP.md) for detailed setup instructions including:
- Database setup
- GitHub OAuth configuration
- Admin settings
- Environment variables

## How It Works

### Bot Creation Flow

1. **User creates bot** → Enters name, description, and phone number
2. **Baileys starts** → Backend creates WhatsApp connection immediately
3. **Pairing code generated** → Real pairing code appears in 3 seconds
4. **User links device** → Enters code in WhatsApp settings
5. **Session saved** → Credentials automatically saved to database
6. **Repository forked** → Main bot repo forked to user's GitHub
7. **Session uploaded** → creds.json uploaded to forked repo
8. **Workflow created** → GitHub Actions workflow deployed
9. **Welcome message** → Bot sends confirmation to WhatsApp
10. **Bot running** → Bot is live and ready to use!

### Architecture

\`\`\`
┌─────────────┐
│   Next.js   │
│   Frontend  │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌─────▼─────┐
│   Supabase  │   │  Baileys  │
│  (Database) │   │ (WhatsApp)│
└─────────────┘   └───────────┘
       │
       │
┌──────▼──────┐
│   GitHub    │
│     API     │
└──────┬──────┘
       │
┌──────▼──────┐
│   GitHub    │
│   Actions   │
│ (Bot Runs)  │
└─────────────┘
\`\`\`

## Main Bot Repository

The platform forks from: [https://github.com/AiOfLautech/God-s-Zeal-Xmd](https://github.com/AiOfLautech/God-s-Zeal-Xmd)

This is a Node.js WhatsApp bot that uses Baileys for WhatsApp Web API integration.

## Admin Features

Admin users (configured via email) can:

- View all users and their bots
- Suspend/unsuspend bots
- Delete users
- Configure GitHub token and main repository
- Monitor platform-wide activity
- View system statistics

Admin email: `godwinhephzibah25@gmail.com` (automatically granted admin privileges)

## API Routes

### Public Routes
- `POST /api/auth/callback` - GitHub OAuth callback

### Protected Routes
- `POST /api/bots/create` - Create new bot with Baileys connection
- `GET /api/bots/[id]/status` - Get bot status and pairing code
- `POST /api/bots/github/deploy` - Deploy bot to GitHub

### Admin Routes
- `GET /api/admin/settings` - Get admin settings
- `POST /api/admin/settings` - Update admin settings
- `POST /api/admin/users/delete` - Delete user
- `POST /api/admin/bots/suspend` - Suspend bot

## Database Schema

### Tables
- `users` - User accounts with GitHub integration
- `bots` - Bot configurations and status
- `bot_logs` - Bot activity logs
- `deployments` - Deployment history
- `admin_settings` - Platform configuration

All tables have Row Level Security (RLS) enabled.

## Security

- **RLS Policies**: All database tables protected with RLS
- **GitHub Tokens**: Stored securely, used only for authorized operations
- **Session Data**: Encrypted and accessible only to bot owner
- **Admin Access**: Restricted to verified admin emails
- **OAuth Scopes**: Minimal required permissions (repo, workflow)

## Deployment Options

### Option 1: Render (Recommended for Production)

**Why Render?**
- Persistent WebSocket connections (required for Baileys)
- No timeout limits on connections
- Docker support for reliable deployments
- Auto-deploys from GitHub
- Free SSL certificates

See [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) for detailed instructions.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Option 2: Vercel (Limited Support)

**Limitations:**
- 60-second function timeout
- Pairing may timeout before code is entered
- No persistent file system for sessions

**Deploy to Vercel:**
\`\`\`bash
npm install -g vercel
vercel
\`\`\`

### Option 3: Cloudflare Pages (Not Recommended)

**Limitations:**
- 30-second worker timeout
- WebSocket limitations
- No persistent storage

See [DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md) for details.

**Recommendation:** Use Render for production deployments to ensure reliable WhatsApp pairing and bot connectivity.

## Development

\`\`\`bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
\`\`\`

## Troubleshooting

### Pairing Code Not Linking

**Issue**: Code generates but shows "Couldn't link device"

**Solutions:**
1. **Use Render instead of Vercel** - Vercel's timeout limits prevent proper pairing
2. Enter the code within 2 minutes of generation
3. Ensure phone number includes country code (e.g., +1234567890)
4. Try regenerating the code
5. Check application logs for Baileys connection errors

### Deployment Platform Issues

**Issue**: Pairing works locally but not in production

**Solution:** The issue is likely due to serverless function timeouts:
- **Vercel**: 60-second timeout (insufficient for pairing)
- **Cloudflare**: 30-second timeout (insufficient for pairing)
- **Render**: No timeout limits (recommended)

Migrate to Render for reliable production deployments.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Check [SETUP.md](./SETUP.md) for configuration help
- Review troubleshooting section above
- Contact platform administrator

## Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Supabase](https://supabase.com) - Backend infrastructure
- [Next.js](https://nextjs.org) - React framework
- [Render](https://render.com) - Recommended deployment platform
- [Vercel](https://vercel.com) - Alternative deployment option

---

Made with ❤️ for God's Zeal Xmd
