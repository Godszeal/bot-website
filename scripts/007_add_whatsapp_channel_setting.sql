-- Add WhatsApp channel JID setting for auto-follow feature
INSERT INTO public.admin_settings (setting_key, setting_value, description, is_secret)
VALUES 
  ('whatsapp_channel_jid', '', 'WhatsApp Channel Newsletter JID for auto-follow after linking device', FALSE),
  ('main_bot_repo_url', 'https://github.com/AiOfLautech/God-s-Zeal-Xmd', 'Complete URL of the main bot repository to fork', FALSE)
ON CONFLICT (setting_key) DO UPDATE SET 
  description = EXCLUDED.description;

-- Update existing main_bot_repo setting to use the correct URL
UPDATE public.admin_settings 
SET setting_value = 'https://github.com/AiOfLautech/God-s-Zeal-Xmd'
WHERE setting_key = 'main_bot_repo';
