-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_update_all" ON public.users;
DROP POLICY IF EXISTS "admins_select_all" ON public.users;
DROP POLICY IF EXISTS "admins_delete_all" ON public.users;

DROP POLICY IF EXISTS "Users can view their own bots" ON public.bots;
DROP POLICY IF EXISTS "Users can create their own bots" ON public.bots;
DROP POLICY IF EXISTS "Users can update their own bots" ON public.bots;
DROP POLICY IF EXISTS "Users can delete their own bots" ON public.bots;
DROP POLICY IF EXISTS "Admins can view all bots" ON public.bots;

DROP POLICY IF EXISTS "Admins can view all logs" ON public.bot_logs;
DROP POLICY IF EXISTS "Admins can view all stats" ON public.usage_stats;

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

-- Users table policies (simplified to avoid recursion)
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id OR is_admin(auth.uid())
  );

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id OR is_admin(auth.uid())
  );

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  USING (is_admin(auth.uid()) AND auth.uid() != id);

-- Bots table policies
CREATE POLICY "bots_select_policy" ON public.bots
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

CREATE POLICY "bots_insert_policy" ON public.bots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bots_update_policy" ON public.bots
  FOR UPDATE
  USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

CREATE POLICY "bots_delete_policy" ON public.bots
  FOR DELETE
  USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Bot logs policies
CREATE POLICY "bot_logs_select_policy" ON public.bot_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_logs.bot_id AND bots.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

-- Usage stats policies
CREATE POLICY "usage_stats_select_policy" ON public.usage_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = usage_stats.bot_id AND bots.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

-- Enable RLS on admin_settings table
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin settings policies (only admins can access)
CREATE POLICY "admin_settings_select_policy" ON public.admin_settings
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "admin_settings_insert_policy" ON public.admin_settings
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "admin_settings_update_policy" ON public.admin_settings
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "admin_settings_delete_policy" ON public.admin_settings
  FOR DELETE
  USING (is_admin(auth.uid()));
