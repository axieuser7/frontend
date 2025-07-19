// Standalone Chatbot Widget för inbäddning
// Detta är en fristående version som kan laddas på vilken webbplats som helst

(function() {
  'use strict';

  // Utility functions for vanilla JS state management
  function useState(initialValue) {
    let value = initialValue;
    const listeners = [];
    
    return [
      () => value,
      (newValue) => {
        value = typeof newValue === 'function' ? newValue(value) : newValue;
        listeners.forEach(listener => listener(value));
      },
      (listener) => listeners.push(listener)
    ];
  }

  function useEffect(effect, deps) {
    // Simplified useEffect for vanilla JS
    effect();
  }

  function useRef(initialValue) {
    return { current: initialValue };
  }

  // Simple createElement helper
  function h(tag, props, ...children) {
    const element = document.createElement(tag);
    
    if (props) {
      Object.keys(props).forEach(key => {
        if (key === 'style' && typeof props[key] === 'object') {
          Object.assign(element.style, props[key]);
        } else if (key.startsWith('on') && typeof props[key] === 'function') {
          element.addEventListener(key.slice(2).toLowerCase(), props[key]);
        } else if (key === 'className') {
          element.className = props[key];
        } else {
          element.setAttribute(key, props[key]);
        }
      });
    }
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child) {
        element.appendChild(child);
      }
    });
    
    return element;
  }

  // Widget API Service
  class WidgetApiService {
    constructor(baseUrl, widgetId) {
      this.baseUrl = baseUrl;
      this.widgetId = widgetId;
    }

    async fetchBotConfig() {
      try {
        const response = await fetch(`${this.baseUrl}/api/widget/${this.widgetId}/config`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch bot config:', error);
        throw error;
      }
    }

    async sendMessage(message, sessionId) {
      try {
        const response = await fetch(`${this.baseUrl}/api/widget/${this.widgetId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, sessionId }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.response || data;
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    }
  }

  // Enhanced ChatWidget with better error handling and features
  function ChatWidget(props) {
    const {
      widgetId,
      baseUrl = 'https://frontenddk.netlify.app',
      position = 'bottom-right',
      sessionId = null,
      theme = {},
      behavior = {}
    } = props;

    // Enhanced state management
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [botConfig, setBotConfig] = useState(null);
    const [error, setError] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const messagesEndRef = useRef(null);

    const apiService = new WidgetApiService(baseUrl, widgetId);

    // Enhanced initialization
    useEffect(async () => {
      try {
        setConnectionStatus('connecting');
        const config = await apiService.fetchBotConfig();
        setBotConfig(config);
        setConnectionStatus('connected');
        
        // Set welcome message
        if (config.first_message || config.welcome_message) {
          const welcomeMsg = {
            id: 'welcome',
            content: config.first_message || config.welcome_message,
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages([welcomeMsg]);
        }

        // Auto-open if configured
        if (behavior.autoOpen) {
          setTimeout(() => setIsOpen(true), 1000);
        }
      } catch (err) {
        setConnectionStatus('error');
        setError('Failed to load chatbot configuration');
        console.error('Widget initialization error:', err);
      }
    }, []);

    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages]);

    // Enhanced message sending with typing indicator
    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!inputMessage.trim() || isLoading) return;
      if (!botConfig) {
        console.error('Bot configuration not loaded');
        return;
      }

      const userMessage = {
        id: Date.now().toString(),
        content: inputMessage,
        role: 'user',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsLoading(true);
      setIsTyping(true);

      try {
        // Simulate typing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await apiService.sendMessage(inputMessage, sessionId);
        
        setIsTyping(false);
        
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          content: response,
          role: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);

        // Trigger custom event for analytics
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'chatbot_message', {
            event_category: 'engagement',
            event_label: 'user_message'
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setIsTyping(false);
        const errorResponse = {
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

    // Enhanced loading and error states
    if (!botConfig && !error) {
      return h('div', {
        style: { 
          position: 'fixed', 
          ...getPositionStyles(position),
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#3B82F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px'
        } 
      }, '...');
    }

    // Enhanced error state
    if (error) {
      return h('div', { 
        style: { 
          position: 'fixed', 
          ...getPositionStyles(position),
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer'
        } 
      }, '!');
    }

    // Get position styles
    function getPositionStyles(pos) {
      const positions = {
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
      };
      return positions[pos] || positions['bottom-right'];
    }

    // Merge theme with defaults
    const finalTheme = {
      primaryColor: botConfig.primary_color || '#3B82F6',
      borderRadius: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...theme
    };

    // Merge behavior with defaults
    const finalBehavior = {
      autoOpen: false,
      showWelcomeMessage: true,
      enableTypingIndicator: true,
      enableSoundNotifications: false,
      ...behavior
    };

    const widgetStyle = {
      position: 'fixed',
      ...getPositionStyles(position),
      zIndex: 9999,
      fontFamily: finalTheme.fontFamily
    };

    return h('div', { style: widgetStyle },
      // Chat-fönster
      isOpen && h('div', {
        className: 'chatbot-widget-window',
        style: {
          marginBottom: '16px',
          backgroundColor: 'white',
          borderRadius: finalTheme.borderRadius,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e5e7eb',
          width: '320px',
          height: isMinimized ? '64px' : '384px',
          transition: 'all 0.3s ease',
          overflow: 'hidden'
        }
      },
        // Header
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: finalTheme.primaryColor,
            borderRadius: `${finalTheme.borderRadius} ${finalTheme.borderRadius} 0 0`,
            color: 'white',
            cursor: 'pointer'
          },
          onClick: () => setIsMinimized(!isMinimized)
        },
          h('div', { style: { display: 'flex', alignItems: 'center' } },
            h('div', {
              style: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }
            }, '💬'),
            h('div', {},
              h('h3', { style: { fontWeight: '600', fontSize: '14px', margin: 0 } }, botConfig.name),
              h('p', { 
                style: { fontSize: '12px', opacity: 0.9, margin: 0 } 
              }, connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Ansluter...' : 'Offline')
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('button', {
              onClick: (e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              },
              style: {
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '16px'
              }
            }, isMinimized ? '⬆️' : '⬇️'),
            h('button', {
              onClick: (e) => {
                e.stopPropagation();
                setIsOpen(false);
              },
              style: {
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '16px'
              }
            }, '✕')
          )
        ),

        // Chat-innehåll (endast om inte minimerad)
        !isMinimized && [
          // Meddelanden
          h('div', {
            key: 'messages',
            style: {
              height: '280px',
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: '#f9fafb'
            }
          },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
              ...messages.map(message =>
                h('div', {
                  key: message.id,
                  style: {
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }
                },
                  h('div', {
                    style: {
                      maxWidth: '240px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      backgroundColor: message.role === 'user' ? finalTheme.primaryColor : 'white',
                      color: message.role === 'user' ? 'white' : '#374151',
                      border: message.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                      wordWrap: 'break-word'
                    }
                  },
                    h('p', { style: { margin: 0 } }, message.content),
                    h('p', {
                      style: {
                        fontSize: '12px',
                        margin: '4px 0 0 0',
                        opacity: 0.7
                      }
                    }, message.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
                  )
                )
              ),
              (isLoading || isTyping) && finalBehavior.enableTypingIndicator && h('div', {
                style: { display: 'flex', justifyContent: 'flex-start' }
              },
                h('div', {
                  style: {
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    gap: '4px'
                  }
                },
                  h('div', { style: { width: '8px', height: '8px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite' } }),
                  h('div', { style: { width: '8px', height: '8px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite 0.1s' } }),
                  h('div', { style: { width: '8px', height: '8px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' } })
                )
              ),
              h('div', { ref: messagesEndRef })
            )
          ),

          // Input
          h('div', {
            key: 'input',
            style: {
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: 'white',
              borderRadius: `0 0 ${finalTheme.borderRadius} ${finalTheme.borderRadius}`
            }
          },
            h('form', {
              onSubmit: handleSendMessage,
              style: { display: 'flex', gap: '8px' }
            },
              h('input', {
                type: 'text',
                value: inputMessage,
                onChange: (e) => setInputMessage(e.target.value),
                placeholder: 'Skriv ditt meddelande...',
                disabled: isLoading,
                style: {
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '20px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: finalTheme.fontFamily
                }
              }),
              h('button', {
                type: 'submit',
                disabled: !inputMessage.trim() || isLoading,
                style: {
                  padding: '8px',
                  borderRadius: '50%',
                  backgroundColor: finalTheme.primaryColor,
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!inputMessage.trim() || isLoading) ? 0.5 : 1,
                  fontSize: '14px'
                }
              }, isLoading ? '...' : '→')
            )
          )
        ]
      ),

      // Chat-knapp
      h('button', {
        className: 'chatbot-widget-button',
        onClick: () => setIsOpen(!isOpen),
        style: {
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: finalTheme.primaryColor,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.2s ease',
          fontFamily: finalTheme.fontFamily
        }
      }, isOpen ? '✕' : '💬')
    );
  }

  // Enhanced rendering function
  function renderChatWidget(container, config) {
    const widget = ChatWidget(config);
    container.appendChild(widget);
    
    // Trigger loaded event
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'chatbot_loaded', {
        event_category: 'engagement',
        event_label: config.widgetId
      });
    }
  }

  // Automatisk initialisering om config finns
  if (typeof window !== 'undefined' && window.ChatbotConfig) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
      initializeWidget();
    }
    
    function initializeWidget() {
      const config = window.ChatbotConfig;
      if (config.widgetId) {
        const container = document.getElementById('chatbot-widget') || document.body;
        const widget = document.createElement('div');
        widget.id = 'chatbot-widget-instance';
        container.appendChild(widget);
        
        renderChatWidget(widget, config);
      }
    }
  }

  // Exportera för manuell användning
  if (typeof window !== 'undefined') {
    window.ChatWidget = ChatWidget;
    window.ChatbotPro = {
      version: '1.0.0',
      init: renderChatWidget,
      ChatWidget: ChatWidget
    };
  }

  // Enhanced CSS för animationer och responsivitet
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
    
    .chatbot-widget-button:hover {
      transform: scale(1.05);
    }
    
    .chatbot-widget-window {
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    @media (max-width: 768px) {
      .chatbot-widget-window {
        width: calc(100vw - 40px) !important;
        max-width: 350px !important;
      }
    }
    
    @media (max-width: 480px) {
      .chatbot-widget-window {
        width: calc(100vw - 20px) !important;
        height: 70vh !important;
        max-height: 500px !important;
      }
    }
  `;
  document.head.appendChild(style);

})();