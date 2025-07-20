export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface BotConfig {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  tone: 'friendly' | 'professional' | 'casual' | 'formal';
  personality?: string;
  primary_color: string;
  avatar_url?: string;
  welcome_message: string;
  company_information?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'claude' | 'groq';
  key_encrypted: string;
  is_active: boolean;
  created_at: string;
}

export interface SupabaseConfig {
  id: string;
  user_id: string;
  project_name: string;
  project_url: string;
  anon_key: string;
  service_role_key?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: string;
  metadata?: {
    provider?: string;
    model?: string;
    tokens?: number;
    confidence?: number;
  };
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  source?: string;
  title?: string;
  category?: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  bot_config_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  widgetId: string;
  baseUrl: string;
  position: 'bottom-right' | 'bottom-left';
  sessionId?: string;
  theme?: {
    primaryColor?: string;
    borderRadius?: string;
    fontFamily?: string;
  };
  behavior?: {
    autoOpen?: boolean;
    showWelcomeMessage?: boolean;
    enableTypingIndicator?: boolean;
    enableSoundNotifications?: boolean;
  };
}

export interface DeploymentConfig {
  platform: 'html' | 'react' | 'wordpress' | 'shopify' | 'custom';
  widgetId: string;
  customizations?: {
    css?: string;
    javascript?: string;
    analytics?: boolean;
  };
}