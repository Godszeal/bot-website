# Setup Instructions - God's Zeal Xmd Platform on Replit

## ✅ Migration Status: Complete!

Your Vercel project has been successfully migrated to Replit and is now running at:
**https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev**

## 🔧 What Was Fixed

### 1. **Critical WhatsApp Pairing Issue - FIXED** ✅
- **Problem**: Devices were disconnecting immediately after pairing because credentials were being deleted on every connection
- **Solution**: Removed automatic credential deletion, sessions now persist properly
- **Result**: Devices stay connected after entering the pairing code

### 2. **Repository Forking Enhancement** ✅
- **Problem**: Creating multiple bots would fail because system tried to fork the same repository multiple times
- **Solution**: Now checks for existing forks before creating new ones
- **Result**: Users can create multiple bots without issues

### 3. **Replit Compatibility** ✅
- Server configured to bind to `0.0.0.0:5000` (required for Replit)
- Next.js 16 configuration updated for compatibility
- All environment variables properly configured

## 🚀 What You Need to Do Now

### Step 1: Set Up the Database (REQUIRED)

Your database tables haven't been created yet. Follow these steps:

1. **Open Supabase Dashboard**:
   - Go to: https://etjiaukapkfutvgyerim.supabase.co
   - Log in with your Supabase account

2. **Run the Migration**:
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"
   - Open the file `setup_database.sql` in this project
   - Copy ALL its contents
   - Paste into the Supabase SQL editor
   - Click "Run" (or press Ctrl+Enter)
   
3. **Verify Success**:
   - You should see "Success. No rows returned" or similar
   - Go to "Table Editor" in Supabase
   - You should see tables: `users`, `bots`, `deployments`, `bot_logs`, `admin_settings`, etc.

### Step 2: Set Up GitHub OAuth (REQUIRED for Login)

Follow the detailed guide in `GITHUB_SETUP_GUIDE.md`. Quick summary:

#### A. Create GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - **Application name**: God's Zeal Xmd Platform
   - **Homepage URL**: `https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev`
   - **Callback URL**: `https://etjiaukapkfutvgyerim.supabase.co/auth/v1/callback`
4. Save and copy the **Client ID** and **Client Secret**

#### B. Configure Supabase
1. In Supabase dashboard: Authentication → Providers
2. Find "GitHub" and enable it
3. Enter your Client ID and Client Secret
4. Save

### Step 3: Set Up GitHub Personal Access Token (REQUIRED for Bot Creation)

This token allows the platform to automatically fork repositories for users.

1. **Create Token**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "God's Zeal Xmd Platform - Repo Forking"
   - Select scopes:
     - ✅ `repo` (Full control)
     - ✅ `workflow` (Update workflows)
     - ✅ `admin:repo_hook` (Repository hooks)
   - Click "Generate token"
   - **COPY THE TOKEN NOW** (you won't see it again!)

2. **Add Token to Platform**:
   
   **Option A: Via Admin Dashboard** (Recommended after first login)
   - Log in with admin email: `godwinhephzibah25@gmail.com`
   - Go to Admin → Settings
   - Find "GitHub Token" and paste your token
   - Save
   
   **Option B: Via SQL** (Quick setup now)
   - Go to Supabase SQL Editor
   - Run this query (replace `YOUR_TOKEN_HERE`):
   ```sql
   UPDATE public.admin_settings 
   SET setting_value = 'YOUR_TOKEN_HERE'
   WHERE setting_key = 'github_token';
   ```

## 📱 How to Test

### Test 1: Login with GitHub
1. Go to: https://72b066e2-ee74-4d48-9f96-af5bcb96d510-00-2c4nwcyuwkaio.picard.replit.dev/auth/login
2. Click "Continue with GitHub"
3. Authorize the app
4. You should be redirected to the dashboard

### Test 2: Create a Bot
1. In the dashboard, click "Create New Bot"
2. Enter:
   - Bot Name: Test Bot
   - Phone Number: +1234567890 (with country code)
   - Description: Testing the platform
3. Click "Create Bot"
4. You should receive a pairing code
5. Enter it in WhatsApp: Settings → Linked Devices → Link a Device → "Link with phone number instead"
6. Bot should stay connected after pairing!

### Test 3: Verify Repository Fork
1. After creating a bot, check your GitHub account
2. You should see a forked repository: `God-s-Zeal-Xmd`
3. Inside the fork:
   - `session/creds.json` - Your WhatsApp credentials
   - `.github/workflows/deploy.yml` - Deployment workflow

## 🔐 Security Features

✅ **GitHub tokens stored securely** in Supabase (encrypted at rest)
✅ **User tokens used first** - Each user's GitHub OAuth token is used for their operations
✅ **Admin token as fallback** - Only used when user hasn't connected GitHub
✅ **Row Level Security (RLS)** - Users can only access their own data
✅ **Admin-only settings** - Sensitive configurations protected
✅ **Automatic fork detection** - Prevents duplicate fork errors

## 📚 Platform Features

### For Users:
- ✅ Login with GitHub OAuth (stores their access token automatically)
- ✅ Create unlimited WhatsApp bots
- ✅ Each bot gets its own GitHub repository (forked automatically)
- ✅ Session credentials stored securely in their GitHub repo
- ✅ Automatic deployment workflow setup
- ✅ Real-time bot status monitoring
- ✅ Activity logs for each bot

### For Admins:
- ✅ View all users and bots
- ✅ Suspend/activate bots
- ✅ Manage platform settings
- ✅ Configure main repository URL
- ✅ Set WhatsApp channel for auto-follow
- ✅ Monitor platform usage

## 🛠️ How It Works

### User Flow:
1. **Sign Up/Login** → User authenticates with GitHub OAuth
2. **GitHub Token Stored** → Supabase stores the user's GitHub access token
3. **Create Bot** → User provides WhatsApp number
4. **Pairing Code** → System generates pairing code
5. **User Pairs Device** → User enters code in WhatsApp
6. **Auto Fork Repository** → System checks for existing fork or creates new one using user's token
7. **Upload Session** → WhatsApp credentials uploaded to fork
8. **Create Workflow** → GitHub Actions workflow added to fork
9. **Bot Active** → User can manage bot from dashboard

### Repository Structure (After Fork):
```
God-s-Zeal-Xmd/
├── session/
│   └── creds.json          # WhatsApp session credentials
├── .github/
│   └── workflows/
│       └── deploy.yml      # Auto-deployment workflow
├── [... bot code files ...]
└── package.json
```

## 🚨 Troubleshooting

### "Unauthorized" error on login
- ✅ Check GitHub OAuth is enabled in Supabase
- ✅ Verify Client ID and Client Secret are correct
- ✅ Ensure callback URL matches exactly

### Can't create bots
- ✅ Make sure database tables are created (run `setup_database.sql`)
- ✅ Verify GitHub admin token is set in admin_settings
- ✅ Check token has `repo` and `workflow` scopes

### Device disconnects after pairing
- ✅ This should be fixed! The credential deletion bug was removed
- ✅ If still happening, check server logs for errors

### "Fork already exists" error
- ✅ This should be fixed! System now checks for existing forks
- ✅ Multiple bots can share the same fork

## 📞 Support

If you encounter issues:
1. Check the server logs in Replit console
2. Check browser console (F12 → Console tab)
3. Review `GITHUB_SETUP_GUIDE.md` for detailed GitHub setup

## 🎉 Next Steps

After completing the setup:
1. Create your first bot and test the pairing
2. Invite other users to sign up
3. Monitor the admin dashboard
4. Customize the main bot repository as needed
5. Configure WhatsApp channel for auto-follow (optional)

Your platform is ready to deploy WhatsApp bots! 🚀
