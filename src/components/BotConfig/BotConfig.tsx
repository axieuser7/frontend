import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeConfig } from '../../context/RealtimeConfigContext';
import { supabase } from '../../lib/supabase';
import { Save, Palette, MessageCircle, User, Sparkles, Brain, Zap, Eye } from 'lucide-react';
import { BotConfig as BotConfigType } from '../../types';

export function BotConfig() {
  const { user } = useAuth();
  const { botConfig: realtimeConfig, updateConfig, isConnected } = useRealtimeConfig();
  
  const [localConfig, setLocalConfig] = useState<Partial<BotConfigType>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Merge real-time config with local changes
  const config = {
    name: 'AI Assistant',
    system_prompt: 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor. Svara alltid på svenska och var hjälpsam och professionell.',
    tone: 'friendly' as const,
    primary_color: '#2563EB',
    welcome_message: 'Hej! Hur kan jag hjälpa dig idag?',
    company_information: '',
    ...realtimeConfig,
    ...localConfig,
  };

  // Handle local config changes
  const handleConfigChange = (updates: Partial<BotConfigType>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
    
    // Emit event for immediate preview updates
    const event = new CustomEvent('botConfigUpdated', { 
      detail: { ...config, ...updates }
    });
    window.dispatchEvent(event);
  };

  React.useEffect(() => {
    // Reset loading when real-time config is available or when user changes
    if (realtimeConfig !== null || !user) {
      setLoading(false);
      setLocalConfig({});
      setHasUnsavedChanges(false);
    }
  }, [realtimeConfig, user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (realtimeConfig?.id) {
        // Update existing config
        await updateConfig(localConfig);
      } else {
        // Create new config
        const configData = {
          ...config,
          user_id: user.id,
        };
        
        const { data, error } = await supabase
          .from('bot_configs')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
      }
      
      setLocalConfig({});
      setHasUnsavedChanges(false);
      setSuccess('Konfiguration sparad framgångsrikt!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving bot config:', err);
      setError('Kunde inte spara konfigurationen');
    } finally {
      setSaving(false);
    }
  };

  const toneOptions = [
    { 
      value: 'friendly', 
      label: 'Vänlig', 
      description: 'Varm och tillmötesgående',
      icon: 'Friendly',
      color: 'bg-green-100 text-green-800'
    },
    { 
      value: 'professional', 
      label: 'Professionell', 
      description: 'Formell och saklig',
      icon: 'Professional',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      value: 'casual', 
      label: 'Avslappnad', 
      description: 'Informell och ledig',
      icon: 'Casual',
      color: 'bg-purple-100 text-purple-800'
    },
    { 
      value: 'formal', 
      label: 'Formell', 
      description: 'Strikt och korrekt',
      icon: 'Formal',
      color: 'bg-gray-100 text-gray-800'
    },
  ];

  const colorPresets = [
    '#2563EB', '#7C3AED', '#DC2626', '#059669', 
    '#D97706', '#DB2777', '#0891B2', '#4338CA'
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Brain className="w-8 h-8 mr-3" />
              Konfigurera din AI-assistent
            </h1>
            <p className="text-blue-100 text-lg">
              Anpassa personlighet, utseende och beteende för din chatbot
            </p>
            <div className="flex items-center mt-2 space-x-4">
              <div className={`flex items-center text-sm ${isConnected ? 'text-green-200' : 'text-yellow-200'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                {isConnected ? 'Live-uppdateringar aktiva' : 'Ansluter...'}
              </div>
              {hasUnsavedChanges && (
                <div className="flex items-center text-sm text-orange-200">
                  <div className="w-2 h-2 rounded-full mr-2 bg-orange-400"></div>
                  Osparade ändringar
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:flex space-x-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Dölj förhandsvisning' : 'Visa förhandsvisning'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
        
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-3 text-blue-600" />
              Grundinställningar
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Botens namn
                </label>
                <input
                  type="text"
                  value={config.name || ''}
                  onChange={(e) => {
                    handleConfigChange({ name: e.target.value });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="AI Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Välkomstmeddelande
                </label>
                <textarea
                  value={config.welcome_message || ''}
                  onChange={(e) => {
                    handleConfigChange({ welcome_message: e.target.value });
                  }}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Hej! Hur kan jag hjälpa dig idag?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Företagsinformation
                </label>
                <textarea
                  value={config.company_information || ''}
                  onChange={(e) => {
                    handleConfigChange({ company_information: e.target.value });
                  }}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Beskriv ditt företag, produkter, tjänster och annan relevant information som chatboten ska känna till..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Denna information hjälper chatboten att ge mer relevanta och personliga svar om ditt företag.
                </p>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Palette className="w-5 h-5 mr-3 text-purple-600" />
              Utseende
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Primärfärg
              </label>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={config.primary_color || '#2563EB'}
                    onChange={(e) => {
                      handleConfigChange({ primary_color: e.target.value });
                    }}
                    className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primary_color || '#2563EB'}
                    onChange={(e) => {
                      handleConfigChange({ primary_color: e.target.value });
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="#2563EB"
                  />
                </div>
                
                <div className="grid grid-cols-8 gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        handleConfigChange({ primary_color: color });
                      }}
                      className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 ${
                        config.primary_color === color ? 'border-gray-400 scale-110' : 'border-gray-200 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Personality */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <MessageCircle className="w-5 h-5 mr-3 text-green-600" />
              Personlighet & Tonfall
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Välj tonfall
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toneOptions.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="tone"
                        value={option.value}
                        checked={config.tone === option.value}
                        onChange={(e) => {
                          handleConfigChange({ tone: e.target.value as any });
                        }}
                        className="sr-only"
                      />
                      <div className={`
                        p-4 border-2 rounded-xl transition-all duration-200
                        ${config.tone === option.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium px-2 py-1 rounded bg-gray-100">{option.icon}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-600">{option.description}</div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  System Prompt (Avancerat)
                </label>
                <textarea
                  value={config.system_prompt || ''}
                  onChange={(e) => {
                    handleConfigChange({ system_prompt: e.target.value });
                  }}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none font-mono text-sm"
                  placeholder="Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor. Anpassa detta för att definiera botens beteende och expertområden."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Detta är den grundläggande instruktionen som styr hur din bot beter sig. Var specifik om botens roll, expertområden och hur den ska svara.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
              Live förhandsvisning
            </h3>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              {/* Chat Header */}
              <div 
                className="flex items-center p-4 rounded-t-xl text-white mb-4"
                style={{ backgroundColor: config.primary_color || '#2563EB' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {config.name || 'AI Assistant'}
                  </h4>
                  <p className="text-xs opacity-90">Online</p>
                </div>
              </div>

              {/* Sample Messages */}
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg p-3 max-w-xs border border-gray-200">
                    <p className="text-sm text-gray-900">
                      {config.welcome_message || 'Hej! Hur kan jag hjälpa dig idag?'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">12:34</p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div 
                    className="rounded-lg p-3 max-w-xs text-white"
                    style={{ backgroundColor: config.primary_color || '#2563EB' }}
                  >
                    <p className="text-sm">Hej! Kan du hjälpa mig?</p>
                    <p className="text-xs opacity-80 mt-1">12:35</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-white rounded-lg p-3 max-w-xs border border-gray-200">
                    <p className="text-sm text-gray-900">
                      {config.tone === 'friendly' && 'Absolut! Jag hjälper gärna till. Vad kan jag göra för dig? 😊'}
                      {config.tone === 'professional' && 'Naturligtvis. Jag står till er tjänst. Hur kan jag assistera er idag?'}
                      {config.tone === 'casual' && 'Klart! Vad behöver du hjälp med? 👍'}
                      {config.tone === 'formal' && 'Självklart. Jag är här för att bistå er. Vad önskar ni hjälp med?'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">12:35</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tone Indicator */}
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Aktuellt tonfall:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  toneOptions.find(t => t.value === config.tone)?.color || 'bg-gray-100 text-gray-800'
                }`}>
                  {toneOptions.find(t => t.value === config.tone)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-500" />
              Snabbtips
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-gray-700">Använd ett tydligt och beskrivande namn för din bot</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-gray-700">Välj färger som matchar ditt varumärke</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-gray-700">Anpassa system prompt för specifika användningsområden</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-gray-700">Testa olika tonfall för att hitta rätt känsla</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Sparar...
            </>
          ) : !hasUnsavedChanges ? (
            <>
              <Save className="w-5 h-5 mr-2" />
              Sparat
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Spara konfiguration
            </>
          )}
        </button>
      </div>
    </div>
  );
}