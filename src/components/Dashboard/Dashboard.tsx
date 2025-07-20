import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BotConfig } from '../BotConfig/BotConfig';
import { ChatInterface } from '../Chat/ChatInterface';
import { ApiKeyManager } from '../ApiKeys/ApiKeyManager';
import { SupabaseConfigManager } from '../SupabaseConfig/SupabaseConfigManager';
import { WidgetGenerator } from '../EmbeddableWidget/WidgetGenerator';
import { VectorStoreManager } from '../VectorStore/VectorStoreManager';
import { 
  Bot, 
  Settings, 
  Key, 
  Database,
  Code,
  LogOut, 
  Menu,
  X,
  Home,
  Sparkles,
  Bell,
  Search,
  HelpCircle,
  Brain
} from 'lucide-react';

export function Dashboard() {
  const { user, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'config' | 'api-keys' | 'supabase' | 'vector-store' | 'widget'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveConfig, setLiveConfig] = useState(null);

  // Listen for real-time config updates
  React.useEffect(() => {
    const handleConfigUpdate = (event: CustomEvent) => {
      setLiveConfig(event.detail);
    };

    window.addEventListener('botConfigUpdated', handleConfigUpdate as EventListener);

    return () => {
      window.removeEventListener('botConfigUpdated', handleConfigUpdate as EventListener);
    };
  }, []);

  if (!user) {
    return null;
  }

  const navigation = [
    { id: 'overview', name: 'Översikt', icon: Home, description: 'Dashboard och statistik' },
    { id: 'chat', name: 'Testa Chatbot', icon: Bot, description: 'Testa din AI-assistent' },
    { id: 'config', name: 'Konfiguration', icon: Settings, description: 'Anpassa din bot' },
    { id: 'api-keys', name: 'AI-Nycklar', icon: Key, description: 'Hantera API-nycklar' },
    { id: 'supabase', name: 'Kunskapsbas', icon: Database, description: 'Databasanslutning' },
    { id: 'vector-store', name: 'Vector Store', icon: Brain, description: 'AI-powered kunskapsbas' },
    { id: 'widget', name: 'Inbäddning', icon: Code, description: 'Generera widget-kod' },
  ] as const;

  const OverviewComponent = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Välkommen tillbaka!</h1>
            <p className="text-blue-100 text-lg">
              Hantera dina AI-chatbots och se hur de presterar
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktiva Chatbots</p>
              <p className="text-2xl font-bold text-gray-900">1</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">+100% från förra månaden</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Konversationer</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Redo att börja</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">API-Nycklar</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-yellow-600 text-sm font-medium">Lägg till för att börja</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kunskapsbas</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-purple-600 text-sm font-medium">Konfigurera databas</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Kom igång snabbt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => setActiveTab('config')}
            className="p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Konfigurera din bot</h3>
            <p className="text-sm text-gray-600">Anpassa personlighet, tonfall och utseende</p>
          </button>

          <button
            onClick={() => setActiveTab('api-keys')}
            className="p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <Key className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Lägg till AI-nycklar</h3>
            <p className="text-sm text-gray-600">Anslut OpenAI, Claude eller Groq</p>
          </button>

          <button
            onClick={() => setActiveTab('widget')}
            className="p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <Code className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Generera widget</h3>
            <p className="text-sm text-gray-600">Skapa inbäddningskod för din webbplats</p>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out border-r border-gray-200
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-white">ChatBot Pro</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-white/80 hover:text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                    ${activeTab === item.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <div className="text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className={`text-xs ${activeTab === item.id ? 'text-white/80' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500">Premium användare</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logga ut
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 mr-4"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {navigation.find(nav => nav.id === activeTab)?.name || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-600">
                  {navigation.find(nav => nav.id === activeTab)?.description || 'Hantera dina AI-chatbots'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6">
          {activeTab === 'overview' && <OverviewComponent />}
          {activeTab === 'chat' && <ChatInterface key={liveConfig ? JSON.stringify(liveConfig) : 'default'} />}
          {activeTab === 'config' && <BotConfig />}
          {activeTab === 'api-keys' && <ApiKeyManager />}
          {activeTab === 'supabase' && <SupabaseConfigManager />}
          {activeTab === 'vector-store' && <VectorStoreManager />}
          {activeTab === 'widget' && <WidgetGenerator userId={user.id} key={liveConfig ? JSON.stringify(liveConfig) : 'default'} />}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}