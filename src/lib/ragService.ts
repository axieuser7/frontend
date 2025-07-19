import { supabase } from './supabase';
import { VectorService } from './vectorService';
import { SupabaseConfig, KnowledgeBase, BotConfig } from '../types';
import OpenAI from 'openai';

export class RAGService {
  private userSupabaseClient: any = null;
  private userConfig: SupabaseConfig | null = null;
  private cache: Map<string, any> = new Map();
  private vectorService: VectorService = new VectorService();
  private openai: OpenAI | null = null;

  async initializeUserSupabase(userId: string) {
    // Check cache first
    const cacheKey = `supabase_${userId}`;
    if (this.cache.has(cacheKey)) {
      this.userConfig = this.cache.get(cacheKey);
      return this.userSupabaseClient;
    }

    // Hämta användarens Supabase-konfiguration
    const { data: config, error } = await supabase
      .from('supabase_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !config) {
      console.warn('No Supabase configuration found for user, using fallback');
      return null;
    }

    this.userConfig = config;
    this.cache.set(cacheKey, config);

    // Skapa klient för användarens Supabase-projekt
    const { createClient } = await import('@supabase/supabase-js');
    this.userSupabaseClient = createClient(config.project_url, config.anon_key);

    return this.userSupabaseClient;
  }

  async searchKnowledgeBaseVector(query: string, userId: string, limit: number = 5): Promise<any[]> {
    try {
      // Get user's Supabase config
      const { data: config } = await supabase
        .from('supabase_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!config) {
        return [];
      }

      // Initialize vector service
      await this.vectorService.initializeUserSupabase(config.project_url, config.anon_key);
      
      // Get user's OpenAI API key
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('key_encrypted')
        .eq('user_id', userId)
        .eq('provider', 'openai')
        .eq('is_active', true)
        .single();

      if (apiKey) {
        this.vectorService.setOpenAIKey(apiKey.key_encrypted);
        this.openai = new OpenAI({
          apiKey: apiKey.key_encrypted,
          dangerouslyAllowBrowser: true
        });
        
        // Use vector search
        const results = await this.vectorService.searchSimilarDocuments(query, limit, 0.7);
        return results.map(result => ({
          content: result.content,
          source: result.source,
          metadata: result.metadata,
          similarity: result.similarity
        }));
      }

      return [];
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  async searchKnowledgeBase(query: string, userId: string, limit: number = 5): Promise<KnowledgeBase[]> {
    try {
      // Try vector search first
      const vectorResults = await this.searchKnowledgeBaseVector(query, userId, limit);
      if (vectorResults.length > 0) {
        return vectorResults.map(result => ({
          id: Math.random().toString(),
          user_id: userId,
          content: result.content,
          source: result.source,
          metadata: result.metadata,
          created_at: new Date().toISOString()
        }));
      }

      // Fallback to traditional search
      if (!this.userSupabaseClient) {
        await this.initializeUserSupabase(userId);
      }

      if (!this.userSupabaseClient) {
        return [];
      }

      // Try multiple search strategies
      const searchStrategies = [
        // 1. Full-text search
        () => this.userSupabaseClient
          .from('knowledge_base')
          .select('*')
          .textSearch('content', query)
          .limit(limit),
        
        // 2. ILIKE search for partial matches
        () => this.userSupabaseClient
          .from('knowledge_base')
          .select('*')
          .ilike('content', `%${query}%`)
          .limit(limit),
        
        // 3. Keyword-based search
        () => this.userSupabaseClient
          .from('knowledge_base')
          .select('*')
          .or(query.split(' ').map(word => `content.ilike.%${word}%`).join(','))
          .limit(limit)
      ];

      for (const strategy of searchStrategies) {
        try {
          const { data, error } = await strategy();
          if (!error && data && data.length > 0) {
            return data;
          }
        } catch (strategyError) {
          console.warn('Search strategy failed:', strategyError);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('RAG search failed:', error);
      return [];
    }
  }

  async getCompanyInformation(userId: string): Promise<string> {
    try {
      // First try user's Supabase
      if (!this.userSupabaseClient) {
        await this.initializeUserSupabase(userId);
      }

      if (this.userSupabaseClient) {
        const { data, error } = await this.userSupabaseClient
          .from('company_info')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          return data.information || '';
        }
      }

      // Fallback to main bot config
      const { data: botConfig } = await supabase
        .from('bot_configs')
        .select('company_information')
        .eq('user_id', userId)
        .single();

      return botConfig?.company_information || '';
    } catch (error) {
      console.error('Could not fetch company information:', error);
      return '';
    }
  }

  async enhancedContextualResponse(
    userMessage: string,
    botConfig: BotConfig,
    userId: string,
    apiKey: string,
    provider: 'openai' | 'claude' | 'groq'
  ): Promise<string> {
    try {
      // Get conversation context
      const context = await this.buildEnhancedContext(userMessage, userId, botConfig);
      
      // Create enhanced system prompt
      const systemPrompt = this.buildEnhancedSystemPrompt(botConfig, context);
      
      // Call LLM with enhanced context
      return await this.callLLM(userMessage, systemPrompt, apiKey, provider);
    } catch (error) {
      console.error('Enhanced contextual response failed:', error);
      return this.getFallbackResponse(botConfig.tone);
    }
  }

  private async buildEnhancedContext(userMessage: string, userId: string, botConfig: BotConfig): Promise<string> {
    let context = '';

    // 1. Company information
    const companyInfo = await this.getCompanyInformation(userId);
    if (companyInfo) {
      context += `FÖRETAGSINFORMATION:\n${companyInfo}\n\n`;
    }

    // 2. Knowledge base search (now with vector support)
    const relevantDocs = await this.searchKnowledgeBase(userMessage, userId, 5);
    if (relevantDocs.length > 0) {
      context += 'RELEVANT KUNSKAPSBAS:\n';
      relevantDocs.forEach((doc, index) => {
        const similarity = (doc as any).similarity ? ` (${Math.round((doc as any).similarity * 100)}% relevans)` : '';
        context += `${index + 1}. ${doc.content}${similarity}\n`;
      });
      context += '\n';
    }

    // 3. Bot-specific context from config
    if (botConfig.company_information) {
      context += `YTTERLIGARE FÖRETAGSINFO:\n${botConfig.company_information}\n\n`;
    }

    return context;
  }

  private buildEnhancedSystemPrompt(botConfig: BotConfig, context: string): string {
    const toneInstructions = this.getDetailedToneInstructions(botConfig.tone);
    
    return `Du är ${botConfig.name}, en professionell AI-assistent med följande egenskaper:

HUVUDINSTRUKTION: ${botConfig.system_prompt}

TONFALL OCH PERSONLIGHET: ${toneInstructions}

${context ? `TILLGÄNGLIG KONTEXT:\n${context}` : ''}

VIKTIGA RIKTLINJER:
1. Svara ALLTID på svenska
2. Använd den tillgängliga kontexten när det är relevant
3. Om du inte vet svaret baserat på tillgänglig information, säg det ärligt
4. Håll svaren hjälpsamma och i linje med det specificerade tonfallet
5. Referera till företagsinformation när det är lämpligt
6. Var konsekvent med din personlighet genom hela konversationen
7. Om användaren frågar om något utanför din kunskap, erkänn begränsningarna
8. Prioritera alltid användarens säkerhet och integritet

SVARSSTIL: Ge konkreta, användbara svar som hjälper användaren att nå sina mål.`;
  }

  private getDetailedToneInstructions(tone: string): string {
    const toneMap = {
      friendly: 'Vänlig och tillmötesgående. Använd en varm, personlig ton med lämpliga uttryck som "Hej!", "Tack så mycket!" och "Jag hjälper gärna till!". Var entusiastisk men professionell.',
      professional: 'Strikt professionell och saklig. Använd formellt språk, undvik slang, och håll en respektfull distans. Fokusera på fakta och lösningar.',
      casual: 'Avslappnad och informell. Prata som en vän, använd vardagligt språk och var lättsam i tonen. Undvik för formella uttryck.',
      formal: 'Mycket formell och korrekt. Använd traditionellt affärsspråk, fullständiga meningar och undvik förkortningar eller informella uttryck.'
    };
    return toneMap[tone as keyof typeof toneMap] || toneMap.friendly;
  }

  private getFallbackResponse(tone: string): string {
    const responses = {
      friendly: 'Hej! Tyvärr kunde jag inte behandla din förfrågan just nu, men jag hjälper gärna till på annat sätt. Kan du försöka igen eller ställa frågan på ett annat sätt?',
      professional: 'Jag ber om ursäkt, men jag kunde inte behandla er förfrågan för tillfället. Vänligen försök igen eller kontakta support för ytterligare assistans.',
      casual: 'Oj, något gick fel där! Kan du försöka igen? Jag är här för att hjälpa till.',
      formal: 'Jag beklagar att jag för närvarande inte kan behandla er förfrågan. Vänligen försök igen eller kontakta vår support för assistans.'
    };
    return responses[tone as keyof typeof responses] || responses.friendly;
  }

  // Legacy method for backward compatibility
  async generateContextualResponse(
    userMessage: string,
    botConfig: any,
    userId: string,
    apiKey: string,
    provider: 'openai' | 'claude' | 'groq'
  ): Promise<string> {
    return this.enhancedContextualResponse(userMessage, botConfig, userId, apiKey, provider);
  }

  private buildContext(docs: KnowledgeBase[], companyInfo: string): string {
    return this.buildEnhancedContext('', '', { company_information: companyInfo } as BotConfig).then(context => {
      if (docs.length > 0) {
        let docContext = 'RELEVANT INFORMATION FRÅN KUNSKAPSBAS:\n';
        docs.forEach((doc, index) => {
          docContext += `${index + 1}. ${doc.content}\n`;
        });
        return context + docContext;
      }
      return context;
    }).catch(() => companyInfo ? `FÖRETAGSINFORMATION:\n${companyInfo}\n\n` : '');
  }

  private buildSystemPrompt(botConfig: any, context: string): string {
    if (typeof context === 'string') {
      return this.buildEnhancedSystemPrompt(botConfig, context);
    }

    // Fallback for legacy calls
    return this.buildEnhancedSystemPrompt(botConfig, '');
  }

  private async callLLM(
    userMessage: string,
    systemPrompt: string,
    apiKey: string,
    provider: 'openai' | 'claude' | 'groq'
  ): Promise<string> {
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(userMessage, systemPrompt, apiKey);
      case 'claude':
        return await this.callClaude(userMessage, systemPrompt, apiKey);
      case 'groq':
        return await this.callGroq(userMessage, systemPrompt, apiKey);
      default:
        throw new Error(`Okänd provider: ${provider}`);
    }
  }

  private async callOpenAI(userMessage: string, systemPrompt: string, apiKey: string): Promise<string> {
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 800,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    return response.choices[0]?.message?.content || 'Kunde inte generera svar.';
  }

  private async callClaude(userMessage: string, systemPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API fel: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'Kunde inte generera svar.';
  }

  private async callGroq(userMessage: string, systemPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 800,
        temperature: 0.8,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API fel: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Kunde inte generera svar.';
  }
}