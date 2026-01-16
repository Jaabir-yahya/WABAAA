-- Enable pg_cron for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily summary at 19:30 EAT (16:30 UTC)
SELECT cron.schedule(
  'daily-summary-elixosense',
  '30 16 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-summary',
    body := '{"business_id":"elixosense","send_reminders":true}'::jsonb
  );
  $$
);
