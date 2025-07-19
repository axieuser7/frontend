import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { VectorService, Document } from '../../lib/vectorService';
import { 
  Database, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Upload, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { SupabaseConfig } from '../../types';

export function VectorStoreManager() {
  const { user } = useAuth();
  const [supabaseConfigs, setSupabaseConfigs] = useState<SupabaseConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<SupabaseConfig | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vectorService] = useState(new VectorService());
  
  // Form states
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({
    content: '',
    source: '',
    metadata: '{}',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingTables, setIsCreatingTables] = useState(false);
  const [tablesCreated, setTablesCreated] = useState(false);

  useEffect(() => {
    if (user) {
      loadSupabaseConfigs();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConfig) {
      initializeVectorService();
      loadDocuments();
    }
  }, [selectedConfig]);

  const loadSupabaseConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('supabase_configs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSupabaseConfigs(data || []);
      if (data && data.length > 0) {
        setSelectedConfig(data[0]);
      }
    } catch (err) {
      console.error('Error loading Supabase configs:', err);
      setError('Kunde inte ladda Supabase-konfigurationer');
    } finally {
      setLoading(false);
    }
  };

  const initializeVectorService = async () => {
    if (!selectedConfig) return;

    try {
      await vectorService.initializeUserSupabase(selectedConfig.project_url, selectedConfig.anon_key);
      
      // Set OpenAI key from user's API keys
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('key_encrypted')
        .eq('user_id', user!.id)
        .eq('provider', 'openai')
        .eq('is_active', true)
        .single();

      if (apiKey) {
        vectorService.setOpenAIKey(apiKey.key_encrypted);
      }
    } catch (err) {
      console.error('Error initializing vector service:', err);
      setError('Kunde inte initialisera vector service');
    }
  };

  const createVectorTables = async () => {
    if (!selectedConfig) return;

    setIsCreatingTables(true);
    setError('');
    setSuccess('');

    try {
      const result = await vectorService.createVectorTables(
        selectedConfig.project_url,
        selectedConfig.service_role_key || selectedConfig.anon_key
      );

      if (result.success) {
        setSuccess('Vector-tabeller skapade framgångsrikt!');
        setTablesCreated(true);
        
        // Create the search function
        await createSearchFunction();
      } else {
        setError(`Fel vid skapande av tabeller: ${result.error}`);
      }
    } catch (err) {
      console.error('Error creating vector tables:', err);
      setError('Kunde inte skapa vector-tabeller');
    } finally {
      setIsCreatingTables(false);
    }
  };

  const createSearchFunction = async () => {
    if (!selectedConfig) return;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(
        selectedConfig.project_url, 
        selectedConfig.service_role_key || selectedConfig.anon_key
      );

      const searchFunctionSQL = `
        CREATE OR REPLACE FUNCTION search_documents(
          query_embedding vector(1536),
          match_threshold float DEFAULT 0.7,
          match_count int DEFAULT 5
        )
        RETURNS TABLE (
          id uuid,
          content text,
          source text,
          metadata jsonb,
          similarity float
        )
        LANGUAGE sql STABLE
        AS $$
          SELECT
            documents.id,
            documents.content,
            documents.source,
            documents.metadata,
            1 - (documents.embedding <=> query_embedding) AS similarity
          FROM documents
          WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
          ORDER BY documents.embedding <=> query_embedding
          LIMIT match_count;
        $$;
      `;

      const { error } = await adminClient.rpc('exec_sql', { sql: searchFunctionSQL });
      
      if (error) {
        console.error('Error creating search function:', error);
      }
    } catch (err) {
      console.error('Error creating search function:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await vectorService.getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Kunde inte ladda dokument');
    }
  };

  const handleAddDocument = async () => {
    if (!newDocument.content.trim()) return;

    try {
      let metadata = {};
      if (newDocument.metadata.trim()) {
        metadata = JSON.parse(newDocument.metadata);
      }

      const result = await vectorService.addDocument(
        newDocument.content,
        newDocument.source || undefined,
        metadata
      );

      if (result.success) {
        setSuccess('Dokument tillagt framgångsrikt!');
        setNewDocument({ content: '', source: '', metadata: '{}' });
        setShowAddDocument(false);
        loadDocuments();
      } else {
        setError(`Fel vid tillägg av dokument: ${result.error}`);
      }
    } catch (err) {
      console.error('Error adding document:', err);
      setError('Kunde inte lägga till dokument');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const result = await vectorService.deleteDocument(documentId);
      
      if (result.success) {
        setSuccess('Dokument borttaget framgångsrikt!');
        loadDocuments();
      } else {
        setError(`Fel vid borttagning av dokument: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Kunde inte ta bort dokument');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await vectorService.searchSimilarDocuments(searchQuery, 5, 0.7);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching documents:', err);
      setError('Kunde inte söka i dokument');
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
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

  if (supabaseConfigs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen Supabase-konfiguration</h3>
            <p className="text-gray-500 mb-4">
              Du måste först konfigurera din Supabase-anslutning för att använda vector store.
            </p>
            <button
              onClick={() => window.location.hash = '#supabase'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Konfigurera Supabase
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Database className="w-8 h-8 mr-3" />
              Vector Store & RAG
            </h1>
            <p className="text-purple-100 text-lg">
              Hantera din kunskapsbas med AI-powered vector search
            </p>
          </div>
          <div className="hidden md:flex space-x-4">
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <div className="text-sm font-medium">Dokument</div>
              <div className="text-2xl font-bold">{documents.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Selection & Setup */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-3 text-blue-600" />
              Projekt & Setup
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Välj Supabase-projekt
                </label>
                <select
                  value={selectedConfig?.id || ''}
                  onChange={(e) => {
                    const config = supabaseConfigs.find(c => c.id === e.target.value);
                    setSelectedConfig(config || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {supabaseConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.project_name} ({config.project_url})
                    </option>
                  ))}
                </select>
              </div>

              {selectedConfig && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Skapa Vector-tabeller</h3>
                  <p className="text-blue-800 text-sm mb-4">
                    Klicka för att automatiskt skapa de nödvändiga tabellerna för vector search i ditt Supabase-projekt.
                  </p>
                  <button
                    onClick={createVectorTables}
                    disabled={isCreatingTables}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isCreatingTables ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Skapar tabeller...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Skapa Vector-tabeller
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-3 text-green-600" />
                Dokument
              </h2>
              <button
                onClick={() => setShowAddDocument(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till dokument
              </button>
            </div>

            {/* Add Document Form */}
            {showAddDocument && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lägg till nytt dokument</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Innehåll *
                    </label>
                    <textarea
                      value={newDocument.content}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                      placeholder="Skriv eller klistra in dokumentinnehållet här..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Källa (valfri)
                    </label>
                    <input
                      type="text"
                      value={newDocument.source}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="t.ex. 'FAQ', 'Produktguide', 'Policydokument'"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metadata (JSON, valfri)
                    </label>
                    <input
                      type="text"
                      value={newDocument.metadata}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, metadata: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                      placeholder='{"category": "support", "priority": "high"}'
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddDocument}
                      disabled={!newDocument.content.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Spara dokument
                    </button>
                    <button
                      onClick={() => setShowAddDocument(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents List */}
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Inga dokument</h3>
                  <p className="text-gray-500">
                    Lägg till ditt första dokument för att börja bygga din kunskapsbas.
                  </p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {doc.source && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2">
                              {doc.source}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(doc.created_at).toLocaleDateString('sv-SE')}
                          </span>
                        </div>
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {doc.content.length > 200 
                            ? `${doc.content.substring(0, 200)}...` 
                            : doc.content
                          }
                        </p>
                        {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500 font-mono">
                              {JSON.stringify(doc.metadata)}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="ml-4 p-2 text-red-500 hover:text-red-700 transition-colors"
                        title="Ta bort dokument"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Search */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2 text-purple-600" />
              Vector Search
            </h3>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Sök i kunskapsbasen..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Söker...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Sök
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Sökresultat</h4>
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div key={index} className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        {result.source && (
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded">
                            {result.source}
                          </span>
                        )}
                        <span className="text-xs text-purple-600 font-medium">
                          {Math.round(result.similarity * 100)}% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {result.content.length > 150 
                          ? `${result.content.substring(0, 150)}...` 
                          : result.content
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">💡 Tips</h4>
            <div className="space-y-2 text-blue-800 text-sm">
              <p>• Lägg till dokument med relevant företagsinformation</p>
              <p>• Använd beskrivande källor för bättre organisation</p>
              <p>• Vector search hittar semantiskt liknande innehåll</p>
              <p>• Metadata hjälper till att kategorisera dokument</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}