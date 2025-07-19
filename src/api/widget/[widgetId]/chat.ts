// API endpoint for widget chat functionality
import { supabase } from '../../../lib/supabase';
import { RAGService } from '../../../lib/ragService';

export async function POST(request: Request, { params }: { params: { widgetId: string } }) {
  try {
    const { widgetId } = params;
    const { message, sessionId } = await request.json();

    // Fetch bot configuration
    const { data: botConfig, error: botError } = await supabase
      .from('bot_configs')
      .select(`
        *,
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

    // Fetch user's API key for the LLM
    const { data: apiKey, error: apiError } = await supabase
      .from('api_keys')
      .select('provider, key_encrypted')
      .eq('user_id', botConfig.user_id)
      .eq('is_active', true)
      .single();

    if (apiError || !apiKey) {
      return new Response(JSON.stringify({ error: 'No active API key found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize RAG service
    const ragService = new RAGService();

    // Generate contextual response using RAG
    const response = await ragService.generateContextualResponse(
      message,
      botConfig,
      botConfig.user_id,
      apiKey.key_encrypted, // In production, decrypt this
      apiKey.provider as 'openai' | 'claude' | 'groq'
    );

    // Optionally save chat history
    if (sessionId) {
      // Save to chat_sessions and chat_messages tables
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      });

      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: response,
      });
    }

    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://frontenddk.netlify.app',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process message',
      response: 'Ursäkta, jag kunde inte behandla din förfrågan just nu. Försök igen senare.'
    }), {
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}