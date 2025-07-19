import { supabase } from './supabase';
import { SupabaseConfig, KnowledgeBase } from '../types';

export class RAGService {
  private userSupabaseClient: any = null;
  private userConfig: SupabaseConfig | null = null;

  async initializeUserSupabase(userId: string) {
    // Hämta användarens Supabase-konfiguration
    const { data: config, error } = await supabase
      .from('supabase_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !config) {
      throw new Error('Ingen Supabase-konfiguration hittades för användaren');
    }

    this.userConfig = config;

    // Skapa klient för användarens Supabase-projekt
    const { createClient } = await import('@supabase/supabase-js');
    this.userSupabaseClient = createClient(config.project_url, config.anon_key);

    return this.userSupabaseClient;
  }

  async searchKnowledgeBase(query: string, userId: string, limit: number = 5): Promise<KnowledgeBase[]> {
    if (!this.userSupabaseClient) {
      await this.initializeUserSupabase(userId);
    }

    try {
      // Använd Supabase's inbyggda similarity search om tillgängligt
      const { data, error } = await this.userSupabaseClient
        .from('knowledge_base')
        .select('*')
        .textSearch('content', query)
        .limit(limit);

      if (error) {
        console.error('Fel vid sökning i kunskapsbas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('RAG-sökning misslyckades:', error);
      return [];
    }
  }

  async getCompanyInformation(userId: string): Promise<string> {
    if (!this.userSupabaseClient) {
      await this.initializeUserSupabase(userId);
    }

    try {
      const { data, error } = await this.userSupabaseClient
        .from('company_info')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return '';
      }

      return data.information || '';
    } catch (error) {
      console.error('Kunde inte hämta företagsinformation:', error);
      return '';
    }
  }

  async generateContextualResponse(
    userMessage: string,
    botConfig: any,
    userId: string,
    apiKey: string,
    provider: 'openai' | 'claude' | 'groq'
  ): Promise<string> {
    try {
      // Sök i kunskapsbas
      const relevantDocs = await this.searchKnowledgeBase(userMessage, userId);
      
      // Hämta företagsinformation
      const companyInfo = await this.getCompanyInformation(userId);

      // Bygg kontext
      const context = this.buildContext(relevantDocs, companyInfo);

      // Skapa system prompt
      const systemPrompt = this.buildSystemPrompt(botConfig, context);

      // Anropa LLM
      return await this.callLLM(userMessage, systemPrompt, apiKey, provider);
    } catch (error) {
      console.error('Fel vid generering av kontextuellt svar:', error);
      return 'Ursäkta, jag kunde inte behandla din förfrågan just nu. Försök igen senare.';
    }
  }

  private buildContext(docs: KnowledgeBase[], companyInfo: string): string {
    let context = '';

    if (companyInfo) {
      context += `FÖRETAGSINFORMATION:\n${companyInfo}\n\n`;
    }

    if (docs.length > 0) {
      context += 'RELEVANT INFORMATION FRÅN KUNSKAPSBAS:\n';
      docs.forEach((doc, index) => {
        context += `${index + 1}. ${doc.content}\n`;
      });
      context += '\n';
    }

    return context;
  }

  private buildSystemPrompt(botConfig: any, context: string): string {
    let prompt = `Du är ${botConfig.name}, en AI-assistent med följande egenskaper:

SYSTEM PROMPT: ${botConfig.system_prompt}

TONFALL: ${this.getToneDescription(botConfig.tone)}

${context ? `KONTEXT ATT ANVÄNDA:\n${context}` : ''}

INSTRUKTIONER:
- Svara alltid på svenska
- Använd den information som finns i kontexten ovan när det är relevant
- Om du inte vet svaret baserat på den tillgängliga informationen, säg det ärligt
- Håll svaren hjälpsamma och i linje med det specificerade tonfallet
- Referera till företagsinformationen när det är lämpligt`;

    return prompt;
  }

  private getToneDescription(tone: string): string {
    const toneMap = {
      friendly: 'Vänlig och tillmötesgående, använd en varm och personlig ton',
      professional: 'Professionell och saklig, håll en formell men hjälpsam ton',
      casual: 'Avslappnad och informell, prata som en vän',
      formal: 'Strikt formell och korrekt, använd professionellt språk'
    };
    return toneMap[tone as keyof typeof toneMap] || toneMap.friendly;
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API fel: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Kunde inte generera svar.';
  }

  private async callClaude(userMessage: string, systemPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API fel: ${response.statusText}`);
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
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API fel: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Kunde inte generera svar.';
  }
}