// Standalone Chatbot Widget för inbäddning
// Detta är en fristående version som kan laddas på vilken webbplats som helst

(function() {
  'use strict';

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
        return data.response;
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    }
  }

  function ChatWidget(props) {
    const {
      widgetId,
      baseUrl = window.location.origin,
      position = 'bottom-right',
      sessionId = null
    } = props;

    // State management (simplified vanilla JS)
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [botConfig, setBotConfig] = useState(null);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const apiService = new WidgetApiService(baseUrl, widgetId);

    // Initialize widget
    useEffect(async () => {
      try {
        const config = await apiService.fetchBotConfig();
        setBotConfig(config);
        
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
      } catch (err) {
        setError('Failed to load chatbot configuration');
        console.error('Widget initialization error:', err);
      }
    }, []);

    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages]);

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

      try {
        const response = await apiService.sendMessage(inputMessage, sessionId);
        
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          content: response,
          role: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error sending message:', error);
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

    // Show loading state while config loads
    if (!botConfig && !error) {
      return h('div', { 
        style: { 
          position: 'fixed', 
          bottom: '16px', 
          right: '16px', 
          zIndex: 9999 
        } 
      }, 'Loading...');
    }

    // Show error state
    if (error) {
      return h('div', { 
        style: { 
          position: 'fixed', 
          bottom: '16px', 
          right: '16px', 
          zIndex: 9999,
          color: 'red' 
        } 
      }, error);
    }

    const positionClasses = {
      'bottom-right': { bottom: '16px', right: '16px' },
      'bottom-left': { bottom: '16px', left: '16px' },
    };

    const widgetStyle = {
      position: 'fixed',
      ...positionClasses[position],
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    };

    return h('div', { style: widgetStyle },
      // Chat-fönster
      isOpen && h('div', {
        style: {
          marginBottom: '16px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e5e7eb',
          width: '320px',
          height: isMinimized ? '64px' : '384px',
          transition: 'all 0.3s ease'
        }
      },
        // Header
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: botConfig.primary_color,
            borderRadius: '16px 16px 0 0',
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
              h('p', { style: { fontSize: '12px', opacity: 0.9, margin: 0 } }, 'Online')
            )
          ),
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
              borderRadius: '4px'
            }
          }, '✕')
        ),

        // Chat-innehåll (endast om inte minimerad)
        !isMinimized && [
          // Meddelanden
          h('div', {
            key: 'messages',
            style: {
              height: '256px',
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
                      borderRadius: '16px',
                      fontSize: '14px',
                      backgroundColor: message.role === 'user' ? botConfig.primaryColor : 'white',
                      color: message.role === 'user' ? 'white' : '#374151',
                      border: message.role === 'assistant' ? '1px solid #e5e7eb' : 'none'
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
              isLoading && h('div', {
                style: { display: 'flex', justifyContent: 'flex-start' }
              },
                h('div', {
                  style: {
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    padding: '8px 12px',
                    borderRadius: '16px',
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
              borderRadius: '0 0 16px 16px'
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
                  outline: 'none'
                }
              }),
              h('button', {
                type: 'submit',
                disabled: !inputMessage.trim() || isLoading,
                style: {
                  padding: '8px',
                  borderRadius: '50%',
                  backgroundColor: botConfig.primaryColor,
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!inputMessage.trim() || isLoading) ? 0.5 : 1
                }
              }, '→')
            )
          )
        ]
      ),

      // Chat-knapp
      h('button', {
        onClick: () => setIsOpen(!isOpen),
        style: {
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: botConfig.primary_color,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.2s ease'
        }
      }, isOpen ? '✕' : '💬')
    );
  }

  // Automatisk initialisering om config finns
  if (typeof window !== 'undefined' && window.ChatbotConfig) {
    // Initialize widget with configuration
    const config = window.ChatbotConfig;
    if (config.widgetId) {
      const container = document.getElementById('chatbot-widget') || document.body;
      const widget = document.createElement('div');
      widget.id = 'chatbot-widget-instance';
      container.appendChild(widget);
      
      // Render widget (simplified without React dependency)
      renderChatWidget(widget, config);
    }
  }

  // Exportera för manuell användning
  if (typeof window !== 'undefined') {
    window.ChatWidget = ChatWidget;
  }

  // CSS för animationer
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(style);

})();