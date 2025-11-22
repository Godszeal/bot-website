-- Combined Database Migration for God's Zeal Xmd Platform
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  github_token TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bots table
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phone_number TEXT,
  pairing_code TEXT,
  qr_code TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'pairing', 'active', 'error', 'suspended')),
  github_repo_url TEXT,
  github_repo_name TEXT,
  github_branch TEXT DEFAULT 'main',
  deployment_url TEXT,
  last_deployed_at TIMESTAMPTZ,
  session_data TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot configurations table
CREATE TABLE IF NOT EXISTS public.bot_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, config_key)
);

-- Deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deploying', 'success', 'failed')),
  commit_sha TEXT,
  commit_message TEXT,
  build_logs TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Bot logs table
CREATE TABLE IF NOT EXISTS public.bot_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot messages table (for tracking WhatsApp messages)
CREATE TABLE IF NOT EXISTS public.bot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage statistics table
CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  uptime_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, date)
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON public.bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_status ON public.bots(status);
CREATE INDEX IF NOT EXISTS idx_deployments_bot_id ON public.deployments(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id ON public.bot_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at ON public.bot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_messages_bot_id ON public.bot_messages(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_messages_created_at ON public.bot_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_bot_id_date ON public.usage_stats(bot_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bots_updated_at ON public.bots;
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bot_configs_updated_at ON public.bot_configs;
CREATE TRIGGER update_bot_configs_updated_at BEFORE UPDATE ON public.bot_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  USING (is_admin(auth.uid()) AND auth.uid() != id);

-- Bots table policies
DROP POLICY IF EXISTS "bots_select_policy" ON public.bots;
CREATE POLICY "bots_select_policy" ON public.bots
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "bots_insert_policy" ON public.bots;
CREATE POLICY "bots_insert_policy" ON public.bots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bots_update_policy" ON public.bots;
CREATE POLICY "bots_update_policy" ON public.bots
  FOR UPDATE
  USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "bots_delete_policy" ON public.bots;
CREATE POLICY "bots_delete_policy" ON public.bots
  FOR DELETE
  USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Bot configs policies
DROP POLICY IF EXISTS "bot_configs_select_policy" ON public.bot_configs;
CREATE POLICY "bot_configs_select_policy" ON public.bot_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bot_configs_insert_policy" ON public.bot_configs;
CREATE POLICY "bot_configs_insert_policy" ON public.bot_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bot_configs_update_policy" ON public.bot_configs;
CREATE POLICY "bot_configs_update_policy" ON public.bot_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bot_configs_delete_policy" ON public.bot_configs;
CREATE POLICY "bot_configs_delete_policy" ON public.bot_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

-- Deployments policies
DROP POLICY IF EXISTS "deployments_select_policy" ON public.deployments;
CREATE POLICY "deployments_select_policy" ON public.deployments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = deployments.bot_id AND bots.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "deployments_insert_policy" ON public.deployments;
CREATE POLICY "deployments_insert_policy" ON public.deployments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = deployments.bot_id AND bots.user_id = auth.uid()
    )
  );

-- Bot logs policies
DROP POLICY IF EXISTS "bot_logs_select_policy" ON public.bot_logs;
CREATE POLICY "bot_logs_select_policy" ON public.bot_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_logs.bot_id AND bots.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "bot_logs_insert_policy" ON public.bot_logs;
CREATE POLICY "bot_logs_insert_policy" ON public.bot_logs
  FOR INSERT
  WITH CHECK (TRUE);

-- Bot messages policies
DROP POLICY IF EXISTS "bot_messages_select_policy" ON public.bot_messages;
CREATE POLICY "bot_messages_select_policy" ON public.bot_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_messages.bot_id AND bots.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bot_messages_insert_policy" ON public.bot_messages;
CREATE POLICY "bot_messages_insert_policy" ON public.bot_messages
  FOR INSERT
  WITH CHECK (TRUE);

-- Usage stats policies
DROP POLICY IF EXISTS "usage_stats_select_policy" ON public.usage_stats;
CREATE POLICY "usage_stats_select_policy" ON public.usage_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = usage_stats.bot_id AND bots.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "usage_stats_insert_policy" ON public.usage_stats;
CREATE POLICY "usage_stats_insert_policy" ON public.usage_stats
  FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "usage_stats_update_policy" ON public.usage_stats;
CREATE POLICY "usage_stats_update_policy" ON public.usage_stats
  FOR UPDATE
  USING (TRUE);

-- Admin settings policies (only admins can access)
DROP POLICY IF EXISTS "admin_settings_select_policy" ON public.admin_settings;
CREATE POLICY "admin_settings_select_policy" ON public.admin_settings
  FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_settings_insert_policy" ON public.admin_settings;
CREATE POLICY "admin_settings_insert_policy" ON public.admin_settings
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_settings_update_policy" ON public.admin_settings;
CREATE POLICY "admin_settings_update_policy" ON public.admin_settings
  FOR UPDATE
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_settings_delete_policy" ON public.admin_settings;
CREATE POLICY "admin_settings_delete_policy" ON public.admin_settings
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Function to automatically create a user profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, github_username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'user_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-grant admin
CREATE OR REPLACE FUNCTION auto_grant_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'godwinhephzibah25@gmail.com' THEN
    NEW.is_admin = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_grant_admin_trigger ON public.users;
CREATE TRIGGER auto_grant_admin_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION auto_grant_admin();

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, description, is_secret)
VALUES 
  ('github_token', '', 'GitHub Personal Access Token for forking repositories', TRUE),
  ('main_bot_repo_url', 'https://github.com/AiOfLautech/God-s-Zeal-Xmd', 'Complete URL of the main bot repository to fork', FALSE),
  ('main_bot_repo_owner', 'AiOfLautech', 'Owner of the main bot repository', FALSE),
  ('main_bot_repo_name', 'God-s-Zeal-Xmd', 'Name of the main bot repository', FALSE),
  ('whatsapp_channel_jid', '', 'WhatsApp Channel Newsletter JID for auto-follow after linking device', FALSE),
  ('github_oauth_client_id', '', 'GitHub OAuth App Client ID', TRUE),
  ('github_oauth_client_secret', '', 'GitHub OAuth App Client Secret', TRUE)
ON CONFLICT (setting_key) DO UPDATE SET 
  description = EXCLUDED.description;
