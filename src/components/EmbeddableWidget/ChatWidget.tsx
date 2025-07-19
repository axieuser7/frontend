import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { ChatMessage } from '../../types';
import { RAGService } from '../../lib/ragService';

interface ChatWidgetProps {
  botConfig: {
    name: string;
    welcome_message: string;
    first_message: string;
    primaryColor: string;
    tone: string;
    system_prompt: string;
  };
  apiKey: string;
  provider: 'openai' | 'claude' | 'groq';
  userId?: string;
  position?: 'bottom-right' | 'bottom-left';
  minimized?: boolean;
}

export function ChatWidget({ 
  botConfig, 
  apiKey, 
  provider, 
  userId = 'demo-user',
  position = 'bottom-right',
  minimized: initialMinimized = true 
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ragService = new RAGService();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Lägg till välkomstmeddelande
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        content: botConfig.first_message || botConfig.welcome_message,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  }, [isOpen, botConfig.first_message, botConfig.welcome_message, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Använd RAG-service för kontextuellt svar
      const response = await ragService.generateContextualResponse(
        inputMessage,
        botConfig,
        userId,
        apiKey,
        provider
      );

      if (response) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: response,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('Fel vid AI-respons:', error);
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

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 font-sans`}>
      {/* Chat-fönster */}
      {isOpen && (
        <div 
          className={`mb-4 bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ${
            isMinimized ? 'w-80 h-16' : 'w-80 h-96'
          }`}
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 rounded-t-2xl text-white cursor-pointer"
            style={{ backgroundColor: botConfig.primaryColor }}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{botConfig.name}</h3>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat-innehåll */}
          {!isMinimized && (
            <>
              {/* Meddelanden */}
              <div className="flex-1 overflow-y-auto p-4 h-64 bg-gray-50">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`
                        max-w-xs px-3 py-2 rounded-2xl text-sm
                        ${message.role === 'user'
                          ? 'text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                        }
                      `}
                      style={message.role === 'user' ? { backgroundColor: botConfig.primaryColor } : {}}
                      >
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-white text-opacity-70' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('sv-SE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Skriv ditt meddelande..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:border-transparent transition-colors"
                    style={{ 
                      focusRingColor: botConfig.primaryColor,
                      '--tw-ring-color': botConfig.primaryColor 
                    } as any}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 rounded-full text-white hover:opacity-90 focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: botConfig.primaryColor,
                      focusRingColor: botConfig.primaryColor 
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat-knapp */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
        style={{ backgroundColor: botConfig.primaryColor }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}