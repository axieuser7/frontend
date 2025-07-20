/*
  # Add system_prompt column to bot_configs table

  1. Changes
    - Add `system_prompt` column to `bot_configs` table
    - Column stores the AI system instructions for the chatbot
    - Set a default value for existing records

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Provides a sensible default system prompt in Swedish
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bot_configs' AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE bot_configs ADD COLUMN system_prompt text DEFAULT 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor. Svara alltid på svenska och var hjälpsam och professionell.';
  END IF;
END $$;