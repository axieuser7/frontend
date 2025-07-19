import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Save, Palette, MessageCircle, User } from 'lucide-react';
import { BotConfig as BotConfigType } from '../../types';

export function BotConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<Partial<BotConfigType>>({
    name: 'AI Assistant',
    system_prompt: 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
    tone: 'friendly',
    primary_color: '#2563EB',
    welcome_message: 'Hej! Hur kan jag hjälpa dig idag?',
    first_message: 'Välkommen! Jag är här för att hjälpa dig.',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load user's bot config on component mount
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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Error loading bot config:', err);
      setError('Kunde inte ladda bot-konfiguration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError('');

    try {
      const configData = {
        ...config,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        // Update existing config
        const { error } = await supabase
          .from('bot_configs')
          .update(configData)
          .eq('id', config.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('bot_configs')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }
    } catch (err) {
      console.error('Error saving bot config:', err);
      setError('Kunde inte spara konfigurationen');
    } finally {
      setSaving(false);
    }
  };

  const toneOptions = [
    { value: 'friendly', label: 'Vänlig', description: 'Varm och tillmötesgående' },
    { value: 'professional', label: 'Professionell', description: 'Formell och saklig' },
    { value: 'casual', label: 'Avslappnad', description: 'Informell och ledig' },
    { value: 'formal', label: 'Formell', description: 'Strikt och korrekt' },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <User className="w-6 h-6 mr-3 text-blue-600" />
          Chatbot-konfiguration
        </h2>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grundinställningar */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Botens namn
              </label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="AI Assistant"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Välkomstmeddelande
              </label>
              <textarea
                value={config.welcome_message || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Hej! Hur kan jag hjälpa dig idag?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Första meddelande
              </label>
              <textarea
                value={config.first_message || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, first_message: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Välkommen! Jag är här för att hjälpa dig."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Palette className="w-4 h-4 inline mr-2" />
                Primärfärg
              </label>
              <div className="flex space-x-4">
                <input
                  type="color"
                  value={config.primary_color || '#2563EB'}
                  onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primary_color || '#2563EB'}
                  onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="#2563EB"
                />
              </div>
            </div>
          </div>

          {/* Personlighet och ton */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Tonfall
              </label>
              <div className="space-y-3">
                {toneOptions.map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="tone"
                      value={option.value}
                      checked={config.tone === option.value}
                      onChange={(e) => setConfig(prev => ({ ...prev, tone: e.target.value as any }))}
                      className="mt-1 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageCircle className="w-4 h-4 inline mr-2" />
                System Prompt
              </label>
              <textarea
                value={config.system_prompt || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor. Anpassa detta för att definiera botens beteende och expertområden."
              />
              <p className="text-sm text-gray-500 mt-2">
                Detta är den grundläggande instruktionen som styr hur din bot beter sig. Var specifik om botens roll, expertområden och hur den ska svara.
              </p>
            </div>
          </div>
        </div>

        {/* Förhandsvisning */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Förhandsvisning</h3>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: config.primary_color || '#2563EB' }}
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="ml-3 font-medium text-gray-900">
                {config.name || 'AI Assistant'}
              </span>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-900">
                {config.first_message || config.welcome_message || 'Hej! Hur kan jag hjälpa dig idag?'}
              </p>
            </div>
          </div>
        </div>

        {/* Spara-knapp */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Sparar...' : 'Spara konfiguration'}
          </button>
        </div>
      </div>
    </div>
  );
}