-- CREATE TABLE public.player_device_tokens
CREATE TABLE IF NOT EXISTS public.player_device_tokens (
  user_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, token)
);

-- Enable RLS
ALTER TABLE public.player_device_tokens ENABLE ROW LEVEL SECURITY;
