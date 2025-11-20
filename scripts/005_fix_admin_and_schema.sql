-- Fix users table to add is_admin column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='is_admin') THEN
    ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Grant admin privileges to specified email
UPDATE public.users 
SET is_admin = TRUE, role = 'admin'
WHERE email = 'godwinhephzibah25@gmail.com';

-- Create function to auto-grant admin on signup
CREATE OR REPLACE FUNCTION auto_grant_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'godwinhephzibah25@gmail.com' THEN
    NEW.is_admin = TRUE;
    NEW.role = 'admin';
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

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin settings with the fixed repository URL
INSERT INTO public.admin_settings (setting_key, setting_value, description, is_secret)
VALUES 
  ('github_token', '', 'GitHub Personal Access Token for forking repositories', TRUE),
  ('main_bot_repo', 'https://github.com/AiOfLautech/God-s-Zeal-Xmd', 'Main bot repository URL to fork for new bots', FALSE),
  ('main_bot_repo_owner', 'AiOfLautech', 'Owner of the main bot repository', FALSE),
  ('main_bot_repo_name', 'God-s-Zeal-Xmd', 'Name of the main bot repository', FALSE),
  ('github_oauth_client_id', '', 'GitHub OAuth App Client ID', TRUE),
  ('github_oauth_client_secret', '', 'GitHub OAuth App Client Secret', TRUE)
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Add session_data column to bots table for storing WhatsApp session
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bots' AND column_name='session_data') THEN
    ALTER TABLE public.bots ADD COLUMN session_data TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bots' AND column_name='is_connected') THEN
    ALTER TABLE public.bots ADD COLUMN is_connected BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bots' AND column_name='connected_at') THEN
    ALTER TABLE public.bots ADD COLUMN connected_at TIMESTAMPTZ;
  END IF;
END $$;
