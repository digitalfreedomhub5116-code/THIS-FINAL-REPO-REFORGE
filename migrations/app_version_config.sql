-- Seed the initial app_version configuration in the global_config table
INSERT INTO global_config (key, value)
VALUES (
  'app_version',
  '{"latest_version":"5.0.2","min_version":"5.0.2","play_store_url":"https://play.google.com/store/apps/details?id=com.getcapacitor.community.admob"}'
)
ON CONFLICT (key) DO NOTHING;
