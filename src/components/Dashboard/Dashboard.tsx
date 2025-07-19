import React, { useState } from 'react';
// import { useAuth } from '../../context/AuthContext';
import { BotConfig } from '../BotConfig/BotConfig';
import { ChatInterface } from '../Chat/ChatInterface';
import { ApiKeyManager } from '../ApiKeys/ApiKeyManager';
import { SupabaseConfigManager } from '../SupabaseConfig/SupabaseConfigManager';
import { WidgetGenerator } from '../EmbeddableWidget/WidgetGenerator';
import { 
  Bot, 
  Settings, 
  Key, 
  Database,
  Code,
  LogOut, 
  Menu,
  X
} from 'lucide-react';

export function Dashboard() {
  // Tillfällig demo-användare
  const user = { email: 'demo@example.com' };
  const signOut = () => console.log('Logga ut');
  
  const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'api-keys' | 'supabase' | 'widget'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo-data för widget
  const demoBotConfig = {
    id: '1',
    user_id: 'demo',
    name: 'AI Assistant',
    system_prompt: 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
    tone: 'friendly' as const,
    primary_color: '#2563EB',
    first_message: 'Välkommen! Jag är här för att hjälpa dig.',
    welcome_message: 'Hej! Hur kan jag hjälpa dig idag?',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const navigation = [
    { id: 'chat', name: 'Chatbot', icon: Bot },
    { id: 'config', name: 'Konfiguration', icon: Settings },
    { id: 'api-keys', name: 'API-nycklar', icon: Key },
    { id: 'supabase', name: 'Kunskapsbas', icon: Database },
    { id: 'widget', name: 'Inbäddning', icon: Code },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Chatbot Platform</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
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
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
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

      {/* Huvudinnehåll */}
      <div className="flex-1 lg:ml-0">
        {/* Mobil header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find(nav => nav.id === activeTab)?.name}
            </h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Innehåll */}
        <main className="p-6">
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'config' && <BotConfig />}
          {activeTab === 'api-keys' && <ApiKeyManager />}
          {activeTab === 'supabase' && <SupabaseConfigManager />}
          {activeTab === 'widget' && (
            <WidgetGenerator 
              botConfig={demoBotConfig}
              userId="demo-user"
            />
          )}
        </main>
      </div>

      {/* Overlay för mobil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}