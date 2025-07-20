import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeConfig } from '../../context/RealtimeConfigContext';
import { supabase } from '../../lib/supabase';
import { getBaseUrl, getWidgetScriptUrl } from '../../lib/config';
import { Copy, Code, Eye, Download, ExternalLink } from 'lucide-react';
import { BotConfig } from '../../types';

interface WidgetGeneratorProps {
  userId: string;
}

export function WidgetGenerator({ userId }: WidgetGeneratorProps) {
  const { user } = useAuth();
  const { botConfig } = useRealtimeConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    // Set loading to false when we have config data or confirmed no config
    setLoading(false);
  }, [botConfig]);

  const generateEmbedCode = () => {
    if (!botConfig) return '';
    
    const baseUrl = getBaseUrl();
    
    return `<!-- ${botConfig.name} - AI Chatbot Widget -->
<!-- Genererad av ChatBot Pro - https://frontenddk.netlify.app -->
<div id="chatbot-widget"></div>
<script>
  window.ChatbotConfig = {
    widgetId: "${botConfig.id}",
    baseUrl: "${baseUrl}",
    position: "${position}",
    sessionId: null, // Optional: för chat-historik
    // Avancerade inställningar
    theme: {
      primaryColor: "${botConfig.primary_color}",
      borderRadius: "16px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    },
    behavior: {
      autoOpen: false,
      showWelcomeMessage: true,
      enableTypingIndicator: true,
      enableSoundNotifications: false
    }
  };
</script>
<script src="${getWidgetScriptUrl()}"></script>

<!-- Anpassad styling (valfritt) -->
<style>
  /* Anpassa chatbot-widgeten */
  #chatbot-widget {
    /* Widget-container styling */
  }
  
  .chatbot-widget-button {
    /* Anpassa chat-knappen */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
  }
  
  .chatbot-widget-window {
    /* Anpassa chat-fönstret */
    font-family: inherit !important;
  }
  
  /* Responsiv design */
  @media (max-width: 768px) {
    .chatbot-widget-window {
      width: 100vw !important;
      height: 100vh !important;
      border-radius: 0 !important;
    }
  }
</style>`;
  };

  const generateReactCode = () => {
    if (!botConfig) return '';
    
    const baseUrl = getBaseUrl();
    
    return `import React from 'react';
import { ChatWidget } from '@chatbot-pro/react-widget';

// Alternativt: Använd CDN-versionen
// import { ChatWidget } from 'https://cdn.jsdelivr.net/npm/@chatbot-pro/react-widget@latest';

function App() {
  // Optional: Hantera chat-events
  const handleChatEvent = (event, data) => {
    switch (event) {
      case 'message_sent':
        console.log('Användare skickade meddelande:', data);
        break;
      case 'message_received':
        console.log('Bot svarade:', data);
        break;
      case 'chat_opened':
        console.log('Chat öppnades');
        break;
      case 'chat_closed':
        console.log('Chat stängdes');
        break;
    }
  };

  return (
    <div>
      {/* Din befintliga applikation */}
      <header>
        <h1>Min Webbplats</h1>
      </header>
      
      <main>
        {/* Ditt innehåll här */}
      </main>
      
      {/* ChatBot Pro Widget */}
      <ChatWidget
        widgetId="${botConfig.id}"
        baseUrl="${baseUrl}"
        position="${position}"
        sessionId={null} // Optional: för persistent chat-historik
        onEvent={handleChatEvent} // Optional: event-hantering
        theme={{
          primaryColor: "${botConfig.primary_color}",
          borderRadius: "16px",
          fontFamily: "inherit"
        }}
        behavior={{
          autoOpen: false,
          showWelcomeMessage: true,
          enableTypingIndicator: true,
          enableSoundNotifications: false
        }}
      />
    </div>
  );
}

export default App;`;
  };

  const generateWordPressCode = () => {
    if (!botConfig) return '';
    
    return `<?php
/**
 * ${botConfig.name} - ChatBot Pro Integration
 * Lägg till denna kod i ditt temas functions.php eller skapa en plugin
 */

function chatbot_pro_widget() {
    $config = array(
        'widgetId' => '${botConfig.id}',
        'baseUrl' => '${getBaseUrl()}',
        'position' => '${position}',
        'sessionId' => null,
        'theme' => array(
            'primaryColor' => '${botConfig.primary_color}',
            'borderRadius' => '16px',
            'fontFamily' => 'inherit'
        )
    );
    ?>
    <div id="chatbot-widget"></div>
    <script>
        window.ChatbotConfig = <?php echo json_encode($config); ?>;
    </script>
    <script src="${getWidgetScriptUrl()}"></script>
    <?php
}

// Lägg till widget i footer
add_action('wp_footer', 'chatbot_pro_widget');

// Alternativt: Använd shortcode [chatbot_pro]
function chatbot_pro_shortcode($atts) {
    ob_start();
    chatbot_pro_widget();
    return ob_get_clean();
}
add_shortcode('chatbot_pro', 'chatbot_pro_shortcode');
?>`;
  };

  const generateShopifyCode = () => {
    if (!botConfig) return '';
    
    return `<!-- ${botConfig.name} - ChatBot Pro för Shopify -->
<!-- Lägg till denna kod i theme.liquid precis före </body> -->

<div id="chatbot-widget"></div>
<script>
  window.ChatbotConfig = {
    widgetId: "${botConfig.id}",
    baseUrl: "${getBaseUrl()}",
    position: "${position}",
    sessionId: null,
    // Shopify-specifika inställningar
    shopify: {
      shop: "{{ shop.permanent_domain }}",
      customer: {% if customer %}{{ customer | json }}{% else %}null{% endif %},
      cart: {{ cart | json }},
      product: {% if product %}{{ product | json }}{% else %}null{% endif %}
    },
    theme: {
      primaryColor: "${botConfig.primary_color}",
      borderRadius: "16px",
      fontFamily: "{{ settings.type_base_font.family }}, sans-serif"
    }
  };
  
  // Ladda widget asynkront
  (function() {
    var script = document.createElement('script');
    script.src = '${getWidgetScriptUrl()}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>

<style>
  /* Shopify-anpassad styling */
  .chatbot-widget-button {
    z-index: 9999 !important;
  }
  
  /* Dölj på checkout-sidor (valfritt) */
  .template-cart .chatbot-widget-button,
  .template-checkout .chatbot-widget-button {
    display: none !important;
  }
</style>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!botConfig) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen bot-konfiguration</h3>
            <p className="text-gray-500 mb-4">
              Du måste först konfigurera din chatbot innan du kan generera inbäddningskod.
            </p>
            <button
              onClick={() => window.location.hash = '#config'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Konfigurera din bot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Code className="w-6 h-6 mr-3 text-blue-600" />
          Widget-generator
        </h2>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Konfiguration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position på sidan
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="bottom-right">Nedre höger hörn</option>
              <option value="bottom-left">Nedre vänster hörn</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Dölj förhandsvisning' : 'Visa förhandsvisning'}
            </button>
          </div>
        </div>

        {/* Förhandsvisning */}
        {showPreview && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 relative min-h-96">
            <div className="text-center text-gray-500 mb-4">
              <p className="font-medium">Förhandsvisning av widget</p>
              <p className="text-sm">Så här kommer din chatbot att se ut på kundens webbplats</p>
            </div>
            
            {/* Simulerad webbplats */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded mb-3 w-2/3"></div>
              <div className="text-center text-gray-400 text-sm mt-8">
                Kundens webbplatsinnehåll...
              </div>
            </div>

            {/* Widget förhandsvisning */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full">
                {/* Här skulle ChatWidget renderas i förhandsvisning */}
                <div className={`absolute ${position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'}`}>
                  <div 
                    className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: botConfig.primary_color }}
                  >
                    <span className="text-white text-sm">💬</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kod-flikar */}
        <div className="space-y-8">
          {/* HTML/JavaScript */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">HTML/JavaScript (Vanilla)</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(generateEmbedCode())}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Kopierat!' : 'Kopiera'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Fungerar på alla webbplatser. Klistra in precis före &lt;/body&gt; taggen.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generateEmbedCode()}</code>
            </pre>
          </div>

          {/* React */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">React Component</h3>
              <button
                onClick={() => copyToClipboard(generateReactCode())}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                Kopiera
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              För React, Next.js, Gatsby och andra React-baserade ramverk.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generateReactCode()}</code>
            </pre>
          </div>

          {/* WordPress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">WordPress Integration</h3>
              <button
                onClick={() => copyToClipboard(generateWordPressCode())}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                Kopiera
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              PHP-kod för WordPress-teman eller plugins. Inkluderar shortcode-stöd.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generateWordPressCode()}</code>
            </pre>
          </div>

          {/* Shopify */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Shopify Integration</h3>
              <button
                onClick={() => copyToClipboard(generateShopifyCode())}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                Kopiera
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Shopify Liquid-kod med e-handelsintegration och kunddata.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generateShopifyCode()}</code>
            </pre>
          </div>
        </div>

        {/* Installation instruktioner */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Steg-för-steg Installation
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800 text-sm">
            <div>
              <h5 className="font-semibold mb-2">🌐 Vanilla HTML/JS</h5>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Kopiera HTML/JavaScript-koden</li>
                <li>Klistra in precis före &lt;/body&gt; taggen</li>
                <li>Spara och ladda om din webbplats</li>
                <li>Chatbot-knappen visas automatiskt</li>
              </ol>
            </div>
            <div>
              <h5 className="font-semibold mb-2">⚛️ React/Next.js</h5>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Installera: <code className="bg-blue-100 px-1 rounded">npm install @chatbot-pro/react-widget</code></li>
                <li>Importera komponenten</li>
                <li>Lägg till &lt;ChatWidget /&gt; i din app</li>
                <li>Konfigurera props enligt exemplet</li>
              </ol>
            </div>
            <div>
              <h5 className="font-semibold mb-2">📝 WordPress</h5>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Lägg till PHP-koden i functions.php</li>
                <li>Eller använd shortcode [chatbot_pro]</li>
                <li>Alternativt: Custom HTML widget</li>
                <li>Aktivera och testa funktionaliteten</li>
              </ol>
            </div>
            <div>
              <h5 className="font-semibold mb-2">🛒 Shopify</h5>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Gå till Online Store → Themes</li>
                <li>Redigera kod → theme.liquid</li>
                <li>Klistra in före &lt;/body&gt;</li>
                <li>Spara och förhandsgranska</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Avancerade funktioner */}
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3">🚀 Avancerade funktioner</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-green-800 text-sm">
            <div>
              <h5 className="font-semibold mb-2">📊 Analytics Integration</h5>
              <p>Automatisk spårning av konversationer, användarengagemang och konverteringar i Google Analytics och andra verktyg.</p>
            </div>
            <div>
              <h5 className="font-semibold mb-2">🔗 CRM Integration</h5>
              <p>Synkronisera chatkonversationer med HubSpot, Salesforce, Pipedrive och andra CRM-system.</p>
            </div>
            <div>
              <h5 className="font-semibold mb-2">🌍 Multi-språk</h5>
              <p>Automatisk språkdetektering och stöd för över 50 språk med lokaliserade svar.</p>
            </div>
          </div>
        </div>

        {/* Säkerhetsinformation */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">🔒 Säkerhet & Prestanda</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-yellow-800 text-sm">
            <div>
              <h5 className="font-semibold mb-1">Säkerhet</h5>
              <ul className="space-y-1 list-disc list-inside">
                <li>Inga API-nycklar exponeras i frontend</li>
                <li>HTTPS-krypterad kommunikation</li>
                <li>GDPR-kompatibel datahantering</li>
                <li>Säker autentisering via Widget ID</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-1">Prestanda</h5>
              <ul className="space-y-1 list-disc list-inside">
                <li>Asynkron laddning (påverkar inte sidladdning)</li>
                <li>CDN-distribution för snabb leverans</li>
                <li>Optimerad för mobila enheter</li>
                <li>Minimal påverkan på Core Web Vitals</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Hjälplänkar */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">📚 Resurser & Support</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Dokumentation</h5>
              <div className="space-y-2">
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  📖 Fullständig API-dokumentation
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  🎯 Implementationsguider
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  🔧 Felsökningsguide
                </a>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Exempel</h5>
              <div className="space-y-2">
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  💼 E-handelsintegration
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  🏢 Företagswebbplatser
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  📱 Mobilappar
                </a>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Support</h5>
              <div className="space-y-2">
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  💬 Live chat-support
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  📧 E-postsupport
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 text-sm">
                  🎓 Video-tutorials
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}