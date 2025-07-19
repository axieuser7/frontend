// API endpoint for widget chat functionality
import { supabase } from '../../../lib/supabase';
import { RAGService } from '../../../lib/ragService';

export async function POST(request: Request, { params }: { params: { widgetId: string } }) {
  try {
    const { widgetId } = params;
    const { message, sessionId, context } = await request.json();

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
      return new Response(JSON.stringify({ 
        error: 'Bot configuration not found',
        response: 'Ursäkta, jag kunde inte hitta bot-konfigurationen. Kontakta support.'
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Fetch user's API key for the LLM
    const { data: apiKey, error: apiError } = await supabase
      .from('api_keys')
      .select('provider, key_encrypted')
      .eq('user_id', botConfig.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .single();

    if (apiError || !apiKey) {
      return new Response(JSON.stringify({ 
        error: 'No active API key found',
        response: 'Ursäkta, ingen aktiv AI-tjänst är konfigurerad för denna chatbot. Kontakta administratören.'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Initialize RAG service
    const ragService = new RAGService();

    // Generate enhanced contextual response using RAG
    const response = await ragService.enhancedContextualResponse(
      message,
      botConfig,
      botConfig.user_id,
      apiKey.key_encrypted, // In production, decrypt this
      apiKey.provider as 'openai' | 'claude' | 'groq'
    );

    // Save chat history if session ID provided
    if (sessionId) {
      try {
        // Ensure session exists
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          // Create new session
          await supabase.from('chat_sessions').insert({
            id: sessionId,
            user_id: botConfig.user_id,
            bot_config_id: botConfig.id,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          });
        }

        // Save messages
        await supabase.from('chat_messages').insert([
          {
            session_id: sessionId,
            role: 'user',
            content: message,
          },
          {
            session_id: sessionId,
            role: 'assistant',
            content: response,
          }
        ]);
      } catch (historyError) {
        console.error('Failed to save chat history:', historyError);
        // Continue without saving history
      }
    }

    // Return enhanced response with metadata
    const responseData = {
      response,
      metadata: {
        botName: botConfig.name,
        timestamp: new Date().toISOString(),
        provider: apiKey.provider,
        sessionId: sessionId || null,
        hasKnowledgeBase: true, // Will be determined by RAG service
      }
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    // Enhanced error response
    const errorResponse = {
      error: 'Failed to process message',
      response: 'Ursäkta, jag kunde inte behandla din förfrågan just nu. Försök igen senare.',
      metadata: {
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
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
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}