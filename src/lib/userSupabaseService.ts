import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BotConfig, SupabaseConfig } from '../types';

export class UserSupabaseService {
  private userClients: Map<string, SupabaseClient> = new Map();
  private configCache: Map<string, SupabaseConfig> = new Map();

  async initializeUserSupabase(config: SupabaseConfig): Promise<SupabaseClient> {
    const cacheKey = config.id;
    
    if (this.userClients.has(cacheKey)) {
      return this.userClients.get(cacheKey)!;
    }

    try {
      const userClient = createClient(config.project_url, config.anon_key);
      this.userClients.set(cacheKey, userClient);
      this.configCache.set(cacheKey, config);
      
      // Test connection
      const { error } = await userClient.from('bot_configs').select('count').limit(1);
      if (error && error.message.includes('relation "bot_configs" does not exist')) {
        // Tables don't exist, create them
        await this.createRequiredTables(userClient, config);
      }
      
      return userClient;
    } catch (error) {
      console.error('Failed to initialize user Supabase:', error);
      throw new Error('Kunde inte ansluta till ditt Supabase-projekt. Kontrollera dina uppgifter.');
    }
  }

  private async createRequiredTables(client: SupabaseClient, config: SupabaseConfig): Promise<void> {
    if (!config.service_role_key) {
      throw new Error('Service Role Key krävs för att skapa tabeller automatiskt.');
    }

    // Create admin client for table creation
    const adminClient = createClient(config.project_url, config.service_role_key);

    const createTablesSQL = `
      -- Bot configurations table
      CREATE TABLE IF NOT EXISTS bot_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        name text NOT NULL DEFAULT 'AI Assistant',
        system_prompt text DEFAULT 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
        tone text CHECK (tone IN ('friendly', 'professional', 'casual', 'formal')) DEFAULT 'friendly',
        primary_color text DEFAULT '#2563EB',
        welcome_message text DEFAULT 'Hej! Hur kan jag hjälpa dig idag?',
        company_information text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Knowledge base table
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        content text NOT NULL,
        source text,
        metadata jsonb,
        created_at timestamptz DEFAULT now()
      );

      -- Company information table
      CREATE TABLE IF NOT EXISTS company_info (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        information text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Enable RLS
      ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
      ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY IF NOT EXISTS "Enable all operations for all users" 
        ON bot_configs FOR ALL USING (true);
      
      CREATE POLICY IF NOT EXISTS "Enable all operations for all users" 
        ON knowledge_base FOR ALL USING (true);
      
      CREATE POLICY IF NOT EXISTS "Enable all operations for all users" 
        ON company_info FOR ALL USING (true);

      -- Update function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Triggers
      DROP TRIGGER IF EXISTS update_bot_configs_updated_at ON bot_configs;
      CREATE TRIGGER update_bot_configs_updated_at
        BEFORE UPDATE ON bot_configs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_company_info_updated_at ON company_info;
      CREATE TRIGGER update_company_info_updated_at
        BEFORE UPDATE ON company_info
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      const { error } = await adminClient.rpc('exec_sql', { sql: createTablesSQL });
      if (error) {
        // Fallback: try executing parts individually
        console.warn('Bulk SQL execution failed, trying individual statements...');
        await this.createTablesIndividually(adminClient);
      }
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw new Error('Kunde inte skapa nödvändiga tabeller i ditt Supabase-projekt.');
    }
  }

  private async createTablesIndividually(adminClient: SupabaseClient): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS bot_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        name text NOT NULL DEFAULT 'AI Assistant',
        system_prompt text DEFAULT 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
        tone text CHECK (tone IN ('friendly', 'professional', 'casual', 'formal')) DEFAULT 'friendly',
        primary_color text DEFAULT '#2563EB',
        welcome_message text DEFAULT 'Hej! Hur kan jag hjälpa dig idag?',
        company_information text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS knowledge_base (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        content text NOT NULL,
        source text,
        metadata jsonb,
        created_at timestamptz DEFAULT now()
      )`,
      `ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY`,
      `CREATE POLICY IF NOT EXISTS "Enable all operations" ON bot_configs FOR ALL USING (true)`,
      `CREATE POLICY IF NOT EXISTS "Enable all operations" ON knowledge_base FOR ALL USING (true)`
    ];

    for (const statement of statements) {
      try {
        await adminClient.rpc('exec_sql', { sql: statement });
      } catch (error) {
        console.warn('Failed to execute statement:', statement, error);
      }
    }
  }

  async saveBotConfigToUserSupabase(
    config: SupabaseConfig, 
    botConfig: Partial<BotConfig>, 
    userId: string
  ): Promise<BotConfig> {
    const userClient = await this.initializeUserSupabase(config);

    try {
      // Check if config already exists
      const { data: existing } = await userClient
        .from('bot_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      const configData = {
        user_id: userId,
        name: botConfig.name || 'AI Assistant',
        system_prompt: botConfig.system_prompt || 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
        tone: botConfig.tone || 'friendly',
        primary_color: botConfig.primary_color || '#2563EB',
        welcome_message: botConfig.welcome_message || 'Hej! Hur kan jag hjälpa dig idag?',
        company_information: botConfig.company_information || '',
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing config
        const { data, error } = await userClient
          .from('bot_configs')
          .update(configData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new config
        const { data, error } = await userClient
          .from('bot_configs')
          .insert({
            ...configData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Failed to save bot config to user Supabase:', error);
      throw new Error('Kunde inte spara konfigurationen till ditt Supabase-projekt.');
    }
  }

  async loadBotConfigFromUserSupabase(
    config: SupabaseConfig, 
    userId: string
  ): Promise<BotConfig | null> {
    try {
      const userClient = await this.initializeUserSupabase(config);

      const { data, error } = await userClient
        .from('bot_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Failed to load bot config from user Supabase:', error);
      return null;
    }
  }

  async saveCompanyInfoToUserSupabase(
    config: SupabaseConfig,
    companyInfo: string,
    userId: string
  ): Promise<void> {
    const userClient = await this.initializeUserSupabase(config);

    try {
      const { data: existing } = await userClient
        .from('company_info')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing) {
        await userClient
          .from('company_info')
          .update({ 
            information: companyInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await userClient
          .from('company_info')
          .insert({
            user_id: userId,
            information: companyInfo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Failed to save company info to user Supabase:', error);
      throw new Error('Kunde inte spara företagsinformation till ditt Supabase-projekt.');
    }
  }

  async testConnection(config: SupabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const testClient = createClient(config.project_url, config.anon_key);
      
      // Test basic connection
      const { error } = await testClient
        .from('bot_configs')
        .select('count')
        .limit(1);

      if (error && !error.message.includes('relation "bot_configs" does not exist')) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Okänt fel' 
      };
    }
  }

  clearCache(): void {
    this.userClients.clear();
    this.configCache.clear();
  }
}

export const userSupabaseService = new UserSupabaseService();