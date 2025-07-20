import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { RAGService } from '../../lib/ragService';
import { BotConfig } from '../../types';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  widgetId?: string;
  botConfig?: BotConfig;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ widgetId, botConfig }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(botConfig);
  const [ragService] = useState(new RAGService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isConfigListening, setIsConfigListening] = useState(false);

  useEffect(() => {
    if (user && !config) {
      loadBotConfig();
    }
  }, [user, config]);

  // Listen for real-time config updates
  useEffect(() => {
    const handleConfigUpdate = (event: CustomEvent) => {
      const updatedConfig = event.detail;
      setConfig(updatedConfig);
      
      // Update welcome message if it's the first message
      if (messages.length === 1 && messages[0].id === 'welcome') {
        setMessages([{
          id: 'welcome',
          content: updatedConfig.welcome_message || 'Hej! Hur kan jag hjälpa dig idag?',
          isUser: false,
          timestamp: new Date(),
        }]);
      }
    };

    window.addEventListener('botConfigUpdated', handleConfigUpdate as EventListener);
    setIsConfigListening(true);

    return () => {
      window.removeEventListener('botConfigUpdated', handleConfigUpdate as EventListener);
      setIsConfigListening(false);
    };
  }, [messages]);

  useEffect(() => {
    if (config && config.welcome_message) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content: config.welcome_message,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [config]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadBotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_configs')
        .select('*') 
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading bot config:', error);
        throw error;
      }
      
      if (data) {
        setConfig(data);
      } else {
        // Use default configuration if none exists
        setConfig({
          id: '',
          user_id: user!.id,
          name: 'AI Assistant',
          system_prompt: 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
          tone: 'friendly',
          primary_color: '#2563EB',
          welcome_message: 'Hej! Hur kan jag hjälpa dig idag?',
          company_information: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching bot config:', error);
      setError('Kunde inte ladda bot-konfiguration');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    setError('');

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!config) {
        throw new Error('Bot-konfiguration saknas');
      }

      // Get user's API key
      const { data: apiKey, error: apiError } = await supabase
        .from('api_keys')
        .select('provider, key_encrypted')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .single();

      if (apiError || !apiKey) {
        throw new Error('Ingen aktiv API-nyckel hittades. Lägg till en API-nyckel först.');
      }
      
      // Use RAG service for enhanced responses
      const response = await ragService.enhancedContextualResponse(
        inputValue,
        config,
        user!.id,
        apiKey.key_encrypted,
        apiKey.provider as 'openai' | 'claude' | 'groq'
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      setError(error instanceof Error ? error.message : 'Ett fel inträffade');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Ursäkta, jag stötte på ett fel. Försök igen senare.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <Bot className="w-6 h-6 mr-2" />
        <h3 className="font-semibold">
          {config?.name || 'AI Assistant'}
        </h3>
        <div className="ml-auto">
          <span className="text-xs bg-white/20 px-2 py-1 rounded">
            {isLoading ? 'Skriver...' : isConfigListening ? 'Live' : 'Online'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-96">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Starta en konversation med AI-assistenten!</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isUser
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
              style={message.isUser ? { backgroundColor: config?.primary_color || '#3B82F6' } : {}}
            >
              <div className="flex items-start space-x-2">
                {!message.isUser && (
                  <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser ? 'text-white opacity-75' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('sv-SE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {message.isUser && (
                  <User className="w-4 h-4 mt-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Skriv ditt meddelande..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="text-white p-2 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};