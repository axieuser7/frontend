import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getBaseUrl, getWidgetScriptUrl } from '../../lib/config';
import { Copy, Code, Eye, Download, ExternalLink } from 'lucide-react';
import { BotConfig } from '../../types';

interface WidgetGeneratorProps {
  userId: string;
}

export function WidgetGenerator({ userId }: WidgetGeneratorProps) {
  const { user } = useAuth();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load user's bot config
  React.useEffect(() => {
    if (user) {
      loadBotConfig();
    }
  }, [user]);

  const loadBotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setBotConfig(data);
    } catch (err) {
      console.error('Error loading bot config:', err);
      setError('Kunde inte ladda bot-konfiguration');
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedCode = () => {
    if (!botConfig) return '';
    
    const baseUrl = getBaseUrl();
    const config = {
      widgetId: botConfig.id,
      baseUrl: baseUrl,
      position: position,
      sessionId: null, // Optional: for chat history
    };

    return `<!-- Chatbot Widget -->
<div id="chatbot-widget"></div>
<script>
  window.ChatbotConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="${getWidgetScriptUrl()}"></script>

<!-- För anpassad styling (valfritt) -->
<style>
  #chatbot-widget-instance {
    /* Anpassa widget-styling här */
  }
</style>`;
  };

  const generateReactCode = () => {
    if (!botConfig) return '';
    
    const baseUrl = getBaseUrl();
    
    return `import { ChatWidget } from '@din-organisation/chatbot-widget';

function App() {

  return (
    <div>
      {/* Din befintliga app */}
      
      <ChatWidget
        widgetId="${botConfig.id}"
        baseUrl="${baseUrl}"
        position="${position}"
        sessionId={null} // Optional: för chat-historik
      />
    </div>
  );
}`;
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
        <div className="space-y-6">
          {/* HTML/JavaScript */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">HTML/JavaScript (Vanilla)</h3>
              <button
                onClick={() => copyToClipboard(generateEmbedCode())}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Kopierat!' : 'Kopiera kod'}
              </button>
            </div>
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
                Kopiera React-kod
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generateReactCode()}</code>
            </pre>
          </div>
        </div>

        {/* Installation instruktioner */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Installationsinstruktioner
          </h4>
          <div className="space-y-3 text-blue-800 text-sm">
            <div>
              <strong>1. Vanilla HTML/JS:</strong>
              <p>Kopiera koden ovan och klistra in den precis före &lt;/body&gt; taggen på din webbplats.</p>
            </div>
            <div>
              <strong>2. React/Next.js:</strong>
              <p>Installera paketet: <code className="bg-blue-100 px-2 py-1 rounded">npm install @din-organisation/chatbot-widget</code></p>
            </div>
            <div>
              <strong>3. WordPress:</strong>
              <p>Använd en "Custom HTML" widget eller lägg till koden i din tema-fil.</p>
            </div>
            <div>
              <strong>4. Shopify:</strong>
              <p>Lägg till koden i din tema-fil under "Layout" → "theme.liquid".</p>
            </div>
          </div>
        </div>

        {/* Säkerhetsinformation */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Säkerhet & Prestanda</h4>
          <p className="text-yellow-800 text-sm">
            Widgeten ansluter säkert till våra servrar via Widget ID. Inga API-nycklar eller känslig data 
            exponeras i frontend-koden. All AI-kommunikation sker via vår säkra backend.
          </p>
        </div>

        {/* Hjälplänkar */}
        <div className="mt-6 flex flex-wrap gap-4">
          <a
            href="#"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Dokumentation
          </a>
          <a
            href="#"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Exempel-implementationer
          </a>
          <a
            href="#"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Support
          </a>
        </div>
      </div>
    </div>
  );
}