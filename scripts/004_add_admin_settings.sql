-- Admin settings table for storing platform-wide configuration
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant admin privileges to specified email
UPDATE public.users 
SET is_admin = TRUE 
WHERE email = 'godwinhephzibah25@gmail.com';

-- If user doesn't exist yet, create a function to auto-grant admin on signup
CREATE OR REPLACE FUNCTION auto_grant_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'godwinhephzibah25@gmail.com' THEN
    NEW.is_admin = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_grant_admin_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION auto_grant_admin();

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, description, is_secret)
VALUES 
  ('github_token', '', 'GitHub Personal Access Token for forking repositories', TRUE),
  ('main_bot_repo', '', 'Main bot repository URL to fork for new bots', FALSE),
  ('main_bot_repo_owner', '', 'Owner of the main bot repository', FALSE),
  ('main_bot_repo_name', '', 'Name of the main bot repository', FALSE)
ON CONFLICT (setting_key) DO NOTHING;
