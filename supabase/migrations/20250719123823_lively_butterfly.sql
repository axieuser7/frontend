-- Databas-schema för chatbot-plattformen
-- Kör detta i din Supabase SQL Editor

-- Användarkonfigurationer för bottar
CREATE TABLE IF NOT EXISTS bot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'AI Assistant',
  personality text,
  tone text CHECK (tone IN ('friendly', 'professional', 'casual', 'formal')) DEFAULT 'friendly',
  primary_color text DEFAULT '#2563EB',
  avatar_url text,
  welcome_message text DEFAULT 'Hej! Hur kan jag hjälpa dig idag?',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API-nycklar (krypterade)
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text CHECK (provider IN ('openai', 'claude', 'groq')) NOT NULL,
  key_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Supabase-konfigurationer för andra projekt
CREATE TABLE IF NOT EXISTS supabase_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  project_url text NOT NULL,
  anon_key text NOT NULL,
  service_role_key text,
  created_at timestamptz DEFAULT now()
);

-- Chat-historik (valfritt)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_config_id uuid REFERENCES bot_configs(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE supabase_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Säkerhetspolicies
CREATE POLICY "Users can read own bot configs"
  ON bot_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot configs"
  ON bot_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot configs"
  ON bot_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot configs"
  ON bot_configs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Liknande policies för andra tabeller
CREATE POLICY "Users can manage own api keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own supabase configs"
  ON supabase_configs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat sessions"
  ON chat_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Funktioner för uppdatering av timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_bot_configs_updated_at
  BEFORE UPDATE ON bot_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();