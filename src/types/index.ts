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
  primary_color: string;
  avatar_url?: string;
  welcome_message: string;
  first_message: string;
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
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  created_at: string;
}