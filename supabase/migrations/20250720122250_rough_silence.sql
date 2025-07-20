/*
  # Add company_information column to bot_configs table

  1. Changes
    - Add `company_information` column to `bot_configs` table
    - Column allows storing company/business information for chatbot context

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Column is optional (nullable) to maintain backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bot_configs' AND column_name = 'company_information'
  ) THEN
    ALTER TABLE bot_configs ADD COLUMN company_information text;
  END IF;
END $$;