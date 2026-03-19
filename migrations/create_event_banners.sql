CREATE TABLE IF NOT EXISTS event_banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE event_banners ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_banners_active ON event_banners(is_active, display_order);
