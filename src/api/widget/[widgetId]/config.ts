// API endpoint to fetch widget configuration
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request, { params }: { params: { widgetId: string } }) {
  try {
    const { widgetId } = params;

    // Fetch bot configuration from main Supabase
    const { data: botConfig, error: botError } = await supabase
      .from('bot_configs')
      .select(`
        id,
        name,
        system_prompt,
        tone,
        primary_color,
        welcome_message,
        first_message,
        company_information,
        user_id
      `)
      .eq('id', widgetId)
      .single();

    if (botError || !botConfig) {
      return new Response(JSON.stringify({ error: 'Bot configuration not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's Supabase configuration for RAG
    const { data: supabaseConfig, error: supabaseError } = await supabase
      .from('supabase_configs')
      .select('project_url, anon_key')
      .eq('user_id', botConfig.user_id)
      .single();

    // Return sanitized configuration (no sensitive data)
    const config = {
      id: botConfig.id,
      name: botConfig.name,
      system_prompt: botConfig.system_prompt,
      tone: botConfig.tone,
      primary_color: botConfig.primary_color,
      welcome_message: botConfig.welcome_message,
      first_message: botConfig.first_message,
      company_information: botConfig.company_information,
      // Include Supabase config if available (for RAG)
      hasKnowledgeBase: !!supabaseConfig,
      supabase_config: supabaseConfig ? {
        project_url: supabaseConfig.project_url,
        anon_key: supabaseConfig.anon_key,
      } : null,
    };

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://frontenddk.netlify.app',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching widget config:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}