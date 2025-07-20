import { createClient } from '@supabase/supabase-js';

export class DatabaseMigrationService {
  private supabaseUrl: string;
  private serviceKey: string;

  constructor(supabaseUrl: string, serviceKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.serviceKey = serviceKey;
  }

  async ensureSystemPromptColumn(): Promise<{ success: boolean; error?: string }> {
    try {
      // Create admin client with service key
      const adminClient = createClient(this.supabaseUrl, this.serviceKey);

      // Check if system_prompt column exists
      const { data: columns, error: columnError } = await adminClient
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'bot_configs')
        .eq('column_name', 'system_prompt');

      if (columnError) {
        console.error('Error checking columns:', columnError);
        return { success: false, error: columnError.message };
      }

      // If column doesn't exist, add it
      if (!columns || columns.length === 0) {
        console.log('Adding system_prompt column to bot_configs table...');
        
        const { error: migrationError } = await adminClient.rpc('exec_sql', {
          sql: `
            ALTER TABLE bot_configs 
            ADD COLUMN system_prompt text 
            DEFAULT 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor. Svara alltid på svenska och var hjälpsam och professionell.';
          `
        });

        if (migrationError) {
          // Try alternative approach using direct SQL
          const { error: directError } = await adminClient
            .from('bot_configs')
            .select('id')
            .limit(1);

          if (directError && directError.message.includes('system_prompt')) {
            // Column still missing, try raw SQL approach
            try {
              const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${this.serviceKey}`,
                  'Content-Type': 'application/json',
                  'apikey': this.serviceKey
                },
                body: JSON.stringify({
                  sql: `
                    DO $$
                    BEGIN
                      IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'bot_configs' AND column_name = 'system_prompt'
                      ) THEN
                        ALTER TABLE bot_configs ADD COLUMN system_prompt text DEFAULT 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor. Svara alltid på svenska och var hjälpsam och professionell.';
                      END IF;
                    END $$;
                  `
                })
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
              }
            } catch (fetchError) {
              console.error('Direct SQL execution failed:', fetchError);
              return { 
                success: false, 
                error: `Migration failed: ${migrationError?.message || 'Unknown error'}` 
              };
            }
          } else {
            return { 
              success: false, 
              error: `Migration failed: ${migrationError.message}` 
            };
          }
        }

        console.log('Successfully added system_prompt column');
      } else {
        console.log('system_prompt column already exists');
      }

      return { success: true };
    } catch (error) {
      console.error('Database migration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown migration error' 
      };
    }
  }

  async runAllMigrations(): Promise<{ success: boolean; error?: string }> {
    try {
      // Run system_prompt column migration
      const systemPromptResult = await this.ensureSystemPromptColumn();
      if (!systemPromptResult.success) {
        return systemPromptResult;
      }

      // Add any other necessary migrations here
      
      return { success: true };
    } catch (error) {
      console.error('Migration batch error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown batch migration error' 
      };
    }
  }
}

// Auto-migration function that runs on app startup
export async function autoMigrateDatabase(): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.warn('Supabase credentials not found, skipping auto-migration');
      return;
    }

    const migrationService = new DatabaseMigrationService(supabaseUrl, serviceKey);
    const result = await migrationService.runAllMigrations();

    if (result.success) {
      console.log('✅ Database migrations completed successfully');
    } else {
      console.error('❌ Database migration failed:', result.error);
    }
  } catch (error) {
    console.error('Auto-migration error:', error);
  }
}