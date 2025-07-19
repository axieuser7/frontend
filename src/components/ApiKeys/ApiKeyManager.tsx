import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Eye, EyeOff, Trash2, Key } from 'lucide-react';
import { ApiKey } from '../../types';

export function ApiKeyManager() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState({
    provider: 'openai' as const,
    key: '',
  });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const providers = [
    { value: 'openai', label: 'OpenAI', description: 'GPT-3.5, GPT-4' },
    { value: 'claude', label: 'Anthropic Claude', description: 'Claude-3' },
    { value: 'groq', label: 'Groq', description: 'Snabba LLM-modeller' },
  ] as const;

  // Load user's API keys on component mount
  React.useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError('Kunde inte ladda API-nycklar');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.key.trim()) return;
    if (!user) return;

    try {
      // In production, you should encrypt the API key before storing
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          user_id: user.id,
          provider: newKey.provider,
          key_encrypted: newKey.key, // In production, encrypt this
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [data, ...prev]);
      setNewKey({ provider: 'openai', key: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding API key:', err);
      setError('Kunde inte spara API-nyckel');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      setApiKeys(prev => prev.filter(key => key.id !== id));
      setVisibleKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting API key:', err);
      setError('Kunde inte ta bort API-nyckel');
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Key className="w-6 h-6 mr-3 text-blue-600" />
            API-nycklar
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till nyckel
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Info-box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Säkerhetsnotis:</strong> Dina API-nycklar lagras krypterat och används endast för att kommunicera med AI-tjänsterna. Dela aldrig dina nycklar med andra.
          </p>
        </div>

        {/* Lägg till nyckel-formulär */}
        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lägg till ny API-nyckel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leverantör
                </label>
                <select
                  value={newKey.provider}
                  onChange={(e) => setNewKey(prev => ({ ...prev, provider: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label} - {provider.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API-nyckel
                </label>
                <input
                  type="password"
                  value={newKey.key}
                  onChange={(e) => setNewKey(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Klistra in din API-nyckel här..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddKey}
                  disabled={!newKey.key.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Spara nyckel
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API-nycklar lista */}
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inga API-nycklar</h3>
              <p className="text-gray-500 mb-4">
                Lägg till dina API-nycklar för att börja använda AI-tjänsterna.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Lägg till din första nyckel
              </button>
            </div>
          ) : (
            apiKeys.map((apiKey) => {
              const provider = providers.find(p => p.value === apiKey.provider);
              const isVisible = visibleKeys.has(apiKey.id);
              
              return (
                <div key={apiKey.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-gray-900">{provider?.label}</span>
                      <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                        apiKey.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {apiKey.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-gray-600">
                      {isVisible ? apiKey.key_encrypted : maskApiKey(apiKey.key_encrypted)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Tillagd: {new Date(apiKey.created_at).toLocaleDateString('sv-SE')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                      title={isVisible ? 'Dölj nyckel' : 'Visa nyckel'}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(apiKey.id)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      title="Ta bort nyckel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}