-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Bots table policies
CREATE POLICY "Users can view their own bots"
  ON public.bots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bots"
  ON public.bots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots"
  ON public.bots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots"
  ON public.bots FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all bots
CREATE POLICY "Admins can view all bots"
  ON public.bots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Bot configs table policies
CREATE POLICY "Users can view configs for their bots"
  ON public.bot_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create configs for their bots"
  ON public.bot_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update configs for their bots"
  ON public.bot_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete configs for their bots"
  ON public.bot_configs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_configs.bot_id AND bots.user_id = auth.uid()
    )
  );

-- Deployments table policies
CREATE POLICY "Users can view deployments for their bots"
  ON public.deployments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = deployments.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments for their bots"
  ON public.deployments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = deployments.bot_id AND bots.user_id = auth.uid()
    )
  );

-- Bot logs table policies
CREATE POLICY "Users can view logs for their bots"
  ON public.bot_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_logs.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert logs"
  ON public.bot_logs FOR INSERT
  WITH CHECK (TRUE);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON public.bot_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Bot messages table policies
CREATE POLICY "Users can view messages for their bots"
  ON public.bot_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_messages.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert messages"
  ON public.bot_messages FOR INSERT
  WITH CHECK (TRUE);

-- Usage stats table policies
CREATE POLICY "Users can view stats for their bots"
  ON public.usage_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = usage_stats.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert and update stats"
  ON public.usage_stats FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "System can update stats"
  ON public.usage_stats FOR UPDATE
  USING (TRUE);

-- Admins can view all stats
CREATE POLICY "Admins can view all stats"
  ON public.usage_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
