import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeConfig } from '../../context/RealtimeConfigContext';
import { supabase } from '../../lib/supabase';
import { userSupabaseService } from '../../lib/userSupabaseService';
import { Plus, Database, Eye, EyeOff, Trash2, ExternalLink, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { SupabaseConfig } from '../../types';

export function SupabaseConfigManager() {
  const { user } = useAuth();
  const { saveToUserSupabase, setSaveToUserSupabase } = useRealtimeConfig();
  const [configs, setConfigs] = useState<SupabaseConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState({
    project_name: '',
    project_url: '',
    anon_key: '',
    service_role_key: '',
  });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Load user's Supabase configs on component mount
  React.useEffect(() => {
    if (user) {
      loadConfigs();
    }
  }, [user]);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('supabase_configs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (err) {
      console.error('Error loading Supabase configs:', err);
      setError('Kunde inte ladda Supabase-konfigurationer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.project_name.trim() || !newConfig.project_url.trim() || !newConfig.anon_key.trim()) {
      return;
    }
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('supabase_configs')
        .insert([{
          user_id: user.id,
          project_name: newConfig.project_name,
          project_url: newConfig.project_url,
          anon_key: newConfig.anon_key,
          service_role_key: newConfig.service_role_key || null,
        }])
        .select()
        .single();

      if (error) throw error;

      setConfigs(prev => [data, ...prev]);
      setNewConfig({ project_name: '', project_url: '', anon_key: '', service_role_key: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding Supabase config:', err);
      setError('Kunde inte spara Supabase-konfiguration');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('supabase_configs')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      setConfigs(prev => prev.filter(config => config.id !== id));
      setVisibleKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting Supabase config:', err);
      setError('Kunde inte ta bort Supabase-konfiguration');
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

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 8);
  };

  const handleTestConnection = async (config: SupabaseConfig) => {
    setTestingConnection(config.id);
    setError('');
    setSuccess('');

    try {
      const result = await userSupabaseService.testConnection(config);
      
      if (result.success) {
        setSuccess(`Anslutning till ${config.project_name} lyckades!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(`Anslutningsfel för ${config.project_name}: ${result.error}`);
      }
    } catch (err) {
      setError(`Kunde inte testa anslutning: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleSetAsDefault = async (config: SupabaseConfig) => {
    setSaveToUserSupabase(true);
    setSuccess(`${config.project_name} är nu inställt som standard för att spara konfigurationer.`);
    setTimeout(() => setSuccess(''), 3000);
    
    // Clear cache to force reload
    userSupabaseService.clearCache();
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
            <Database className="w-6 h-6 mr-3 text-blue-600" />
            Supabase-konfiguration
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till projekt
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Info-box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Vad är detta?</h3>
          <p className="text-blue-800 text-sm mb-3">
            Konfigurera anslutning till ditt eget Supabase-projekt. När du sparar bot-konfigurationer kommer de att lagras 
            i DITT projekt istället för vårt. Detta ger dig full kontroll över dina data och möjliggör RAG-funktionalitet.
          </p>
          <div className="space-y-2 text-blue-800 text-sm">
            <div className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Automatisk tabellskapning:</strong> Vi skapar nödvändiga tabeller automatiskt</span>
            </div>
            <div className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Data-isolering:</strong> Dina konfigurationer lagras endast i ditt projekt</span>
            </div>
            <div className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>RAG-stöd:</strong> Möjliggör kunskapsbas och vector search</span>
            </div>
          </div>
        </div>

        {/* Save Preference */}
        {configs.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Automatisk sparning till ditt Supabase</h3>
                <p className="text-green-800 text-sm">
                  När aktiverat sparas alla bot-konfigurationer automatiskt till ditt eget Supabase-projekt.
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToUserSupabase}
                  onChange={(e) => setSaveToUserSupabase(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  saveToUserSupabase ? 'bg-green-600' : 'bg-gray-300'
                }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    saveToUserSupabase ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Lägg till konfiguration-formulär */}
        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lägg till Supabase-projekt</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projektnamn
                </label>
                <input
                  type="text"
                  value={newConfig.project_name}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, project_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Mitt kunskapsbasproject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project URL
                </label>
                <input
                  type="url"
                  value={newConfig.project_url}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, project_url: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="https://dittproject.supabase.co"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anon Key
                </label>
                <input
                  type="password"
                  value={newConfig.anon_key}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, anon_key: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Role Key (Valfri)
                </label>
                <input
                  type="password"
                  value={newConfig.service_role_key}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, service_role_key: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Krävs för automatisk tabellskapning. Rekommenderas starkt.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddConfig}
                  disabled={!newConfig.project_name.trim() || !newConfig.project_url.trim() || !newConfig.anon_key.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Spara konfiguration
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

        {/* Konfigurationslista */}
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inga Supabase-projekt</h3>
              <p className="text-gray-500 mb-4">
                Lägg till ditt Supabase-projekt för att aktivera RAG-funktionalitet.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Lägg till ditt första projekt
              </button>
            </div>
          ) : (
            configs.map((config) => {
              const isVisible = visibleKeys.has(config.id);
              
              return (
                <div key={config.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{config.project_name}</h4>
                      <p className="text-sm text-gray-500">
                        Tillagd: {new Date(config.created_at).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={config.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                        title="Öppna projekt"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleTestConnection(config)}
                        disabled={testingConnection === config.id}
                        className="p-2 text-green-500 hover:text-green-700 transition-colors disabled:opacity-50"
                        title="Testa anslutning"
                      >
                        {testingConnection === config.id ? (
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSetAsDefault(config)}
                        className="p-2 text-purple-500 hover:text-purple-700 transition-colors"
                        title="Sätt som standard"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-2 text-red-500 hover:text-red-700 transition-colors"
                        title="Ta bort konfiguration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">URL:</span>
                      <span className="ml-2 text-gray-600">{config.project_url}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700">Anon Key:</span>
                      <span className="ml-2 text-gray-600 font-mono">
                        {isVisible ? config.anon_key : maskKey(config.anon_key)}
                      </span>
                      <button
                        onClick={() => toggleKeyVisibility(config.id)}
                        className="ml-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {config.service_role_key && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700">Service Key:</span>
                        <span className="ml-2 text-gray-600 font-mono">
                          {isVisible ? config.service_role_key : maskKey(config.service_role_key)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Förbättrad hjälpsektion */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">🚀 Kom igång snabbt</h4>
            <div className="space-y-2 text-blue-800 text-sm">
              <p>1. Lägg till ditt Supabase-projekt ovan</p>
              <p>2. Inkludera Service Role Key för automatisk setup</p>
              <p>3. Testa anslutningen med ✓-knappen</p>
              <p>4. Aktivera automatisk sparning</p>
              <p>5. Dina konfigurationer sparas nu i DITT projekt!</p>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">✨ Fördelar</h4>
            <div className="space-y-2 text-green-800 text-sm">
              <p>• Full kontroll över dina data</p>
              <p>• Automatisk tabellskapning</p>
              <p>• RAG och vector search-stöd</p>
              <p>• Ingen data-lock-in</p>
              <p>• Skalbar arkitektur</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}