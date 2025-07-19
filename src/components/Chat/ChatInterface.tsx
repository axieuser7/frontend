import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Send, Bot, User, Sparkles, Zap, MessageSquare, RotateCcw } from 'lucide-react';
import { ChatMessage, BotConfig, ApiKey } from '../../types';
import { RAGService } from '../../lib/ragService';

export function ChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hej! Jag är din AI-assistent. Hur kan jag hjälpa dig idag?',
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ragService = new RAGService();

  // Load user's bot config and API keys
  useEffect(() => {
    if (user) {
      loadUserConfiguration();
    }
  }, [user]);

  const quickSuggestions = [
    "Vad kan du hjälpa mig med?",
    "Berätta om dina funktioner",
    "Hur fungerar AI-chatbots?",
    "Ge mig tips för bättre kundservice"
  ];

  const loadUserConfiguration = async () => {
    try {
      setConfigLoading(true);
      
      // Load bot configuration
      const { data: configData, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (configData) {
        setBotConfig(configData);
        // Update welcome message
        setMessages([{
          id: '1',
          content: configData.first_message || configData.welcome_message || 'Hej! Jag är din AI-assistent. Hur kan jag hjälpa dig idag?',
          role: 'assistant',
          timestamp: new Date(),
        }]);
      }

      // Load active API key
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!keyError && keyData) {
        setApiKey(keyData);
      }

    } catch (error) {
      console.error('Error loading user configuration:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: textToSend,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      let response = '';

      // Use real AI if configured, otherwise fallback to demo responses
      if (botConfig && apiKey && user) {
        try {
          response = await ragService.enhancedContextualResponse(
            textToSend,
            botConfig,
            user.id,
            apiKey.key_encrypted, // In production, decrypt this
            apiKey.provider as 'openai' | 'claude' | 'groq'
          );
        } catch (aiError) {
          console.error('AI response failed, using fallback:', aiError);
          response = generateFallbackResponse(textToSend, botConfig);
        }
      } else {
        // Demo mode fallback
        response = generateFallbackResponse(textToSend, botConfig);
      }

      setIsTyping(false);
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Fel vid AI-respons:', error);
      setIsTyping(false);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Ursäkta, jag kunde inte behandla din förfrågan just nu. Försök igen senare.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (message: string, config: BotConfig | null): string => {
    const lowerMessage = message.toLowerCase();
    const botName = config?.name || 'AI Assistant';
    const tone = config?.tone || 'friendly';
    
    if (lowerMessage.includes('hjälpa') || lowerMessage.includes('funktioner')) {
      return `Som ${botName} kan jag hjälpa dig med många saker!

• Svara på frågor om ditt företag
• Ge kundservice 24/7
• Hantera vanliga förfrågningar
• Guida användare genom processer
• Samla in feedback och information

Jag är tränad att vara ${tone === 'friendly' ? 'vänlig och hjälpsam' : 'professionell och effektiv'} i alla interaktioner. Vad skulle du vilja veta mer om?`;
    } else if (lowerMessage.includes('ai') || lowerMessage.includes('chatbot')) {
      return `AI-chatbots som jag fungerar genom att använda avancerad språkteknologi!

**Så här fungerar det:**
1. **Naturlig språkförståelse** - Jag förstår vad du menar, inte bara vad du skriver
2. **Kontextuell kunskap** - Jag kommer ihåg vår konversation och kan bygga på tidigare svar
3. **Anpassad personlighet** - Jag kan anpassas för olika branscher och tonfall
4. **Kontinuerlig förbättring** - Jag lär mig från varje interaktion

Vill du veta mer om någon specifik del?`;
    } else if (lowerMessage.includes('kundservice') || lowerMessage.includes('tips')) {
      return `Här är mina bästa tips för excellent kundservice!

**Viktiga principer:**
• **Lyssna aktivt** - Förstå kundens verkliga behov
• **Var proaktiv** - Förutse och lös problem innan de uppstår
• **Personalisera** - Behandla varje kund som en individ
• **Följ upp** - Se till att kunden är nöjd med lösningen

**Hur AI kan hjälpa:**
• Snabba svar 24/7
• Konsekvent kvalitet
• Hantera flera kunder samtidigt
• Samla in värdefull feedback

Vill du diskutera någon specifik utmaning du har?`;
    } else {
      const configStatus = config && apiKey ? 'riktig AI-integration' : 'demo-läge';
      return `Tack för din fråga! ${configStatus === 'demo-läge' ? `Som en demo-version av ${botName} ger jag exempel-svar baserat på din konfiguration.` : ''}

${configStatus === 'demo-läge' ? `I en riktig implementation skulle jag:
• Använda din specifika kunskapsbas
• Ansluta till dina AI-tjänster (OpenAI, Claude, etc.)
• Ge mer exakta och anpassade svar` : 'Jag använder din konfigurerade AI-tjänst och kunskapsbas för att ge dig bästa möjliga svar.'}

${tone === 'friendly' ? 'Är det något annat jag kan hjälpa dig med?' : 'Hur kan jag assistera er vidare?'}`;
    }
  };

  const resetChat = () => {
    const welcomeMessage = botConfig?.first_message || botConfig?.welcome_message || 'Hej! Jag är din AI-assistent. Hur kan jag hjälpa dig idag?';
    setMessages([{
      id: '1',
      content: welcomeMessage,
      role: 'assistant',
      timestamp: new Date(),
    }]);
  };

  if (configLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Testa {botConfig?.name || 'din AI-chatbot'}</h2>
              <p className="text-blue-100">Se hur din assistent svarar på frågor</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${apiKey ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm font-medium">{apiKey ? 'AI Aktiv' : 'Demo-läge'}</span>
            </div>
            <button
              onClick={resetChat}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Återställ chat"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-xl border border-gray-200">
        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`flex max-w-xs lg:max-w-md ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  {/* Avatar */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md
                    ${message.role === 'user' 
                      ? 'bg-gradient-to-br from-gray-600 to-gray-700 ml-3' 
                      : 'bg-gradient-to-br from-blue-500 to-purple-600 mr-3'
                    }
                  `}>
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`
                    px-4 py-3 rounded-2xl shadow-sm border
                    ${message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white border-blue-200'
                      : 'bg-white text-gray-900 border-gray-200'
                    }
                  `}>
                    <div className="prose prose-sm max-w-none">
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        message.role === 'user' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {message.content}
                      </p>
                    </div>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString('sv-SE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm">
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
        </div>

        {/* Quick Suggestions */}
        {messages.length === 1 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
              Förslag på frågor att testa:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Skriv ditt meddelande här..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          
          {/* Status */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Zap className="w-3 h-3 mr-1 text-green-500" />
                Demo-läge aktivt
              </span>
              <span>Tryck Enter för att skicka</span>
            </div>
            <span>{inputMessage.length}/500</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`mt-6 border rounded-xl p-6 ${apiKey ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          {apiKey ? 'Live AI-chatbot' : 'Demo-läge'}
        </h3>
        <div className={`space-y-2 text-sm ${apiKey ? 'text-green-800' : 'text-blue-800'}`}>
          {apiKey ? (
            <>
              <p>• Din chatbot använder {apiKey.provider.toUpperCase()} för AI-svar</p>
              <p>• Kunskapsbas och företagsinformation integreras automatiskt</p>
              <p>• Alla svar genereras i realtid baserat på din konfiguration</p>
              <p>• Redo för produktion och inbäddning på din webbplats</p>
            </>
          ) : (
            <>
              <p>• Detta är en demo av din chatbot med fördefinierade svar</p>
              <p>• Lägg till API-nycklar under "AI-Nycklar" för att aktivera riktig AI</p>
              <p>• Konfigurera din bot under "Konfiguration" för att anpassa beteendet</p>
              <p>• Anslut din kunskapsbas under "Supabase-konfiguration"</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}