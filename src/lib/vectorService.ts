import { supabase } from './supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Document {
  id: string;
  content: string;
  embedding: number[];
  source?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  similarity: number;
}

export class VectorService {
  private userSupabaseClient: SupabaseClient | null = null;
  private openaiApiKey: string | null = null;

  async initializeUserSupabase(projectUrl: string, anonKey: string): Promise<SupabaseClient> {
    this.userSupabaseClient = createClient(projectUrl, anonKey);
    return this.userSupabaseClient;
  }

  setOpenAIKey(apiKey: string): void {
    this.openaiApiKey = apiKey;
  }

  async createVectorTables(projectUrl: string, serviceKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const adminClient = createClient(projectUrl, serviceKey);

      const sql = `
        -- Enable pgvector extension
        CREATE EXTENSION IF NOT EXISTS vector;

        -- Create documents table
        CREATE TABLE IF NOT EXISTS documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            content text NOT NULL,
            embedding vector(1536) NOT NULL,
            source text,
            metadata jsonb,
            created_at timestamptz DEFAULT now()
        );

        -- Create index for fast similarity search
        CREATE INDEX IF NOT EXISTS idx_documents_embedding
        ON documents
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);

        -- Additional indexes for performance
        CREATE INDEX IF NOT EXISTS idx_documents_source ON documents (source);
        CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);

        -- Enable RLS
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

        -- Create policy for authenticated users to manage their own documents
        CREATE POLICY "Users can manage own documents"
        ON documents FOR ALL
        TO authenticated
        USING (true);
      `;

      const { error } = await adminClient.rpc('exec_sql', { sql });
      
      if (error) {
        console.error('Error creating vector tables:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in createVectorTables:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not set');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async addDocument(
    content: string, 
    source?: string, 
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string; documentId?: string }> {
    if (!this.userSupabaseClient) {
      return { success: false, error: 'User Supabase client not initialized' };
    }

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Insert document
      const { data, error } = await this.userSupabaseClient
        .from('documents')
        .insert({
          content,
          embedding,
          source,
          metadata,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, documentId: data.id };
    } catch (error) {
      console.error('Error adding document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async searchSimilarDocuments(
    query: string, 
    limit: number = 5, 
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    if (!this.userSupabaseClient) {
      throw new Error('User Supabase client not initialized');
    }

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search for similar documents
      const { data, error } = await this.userSupabaseClient.rpc('search_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
      });

      if (error) {
        console.error('Error searching documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchSimilarDocuments:', error);
      return [];
    }
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userSupabaseClient) {
      return { success: false, error: 'User Supabase client not initialized' };
    }

    try {
      const { error } = await this.userSupabaseClient
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    if (!this.userSupabaseClient) {
      return [];
    }

    try {
      const { data, error } = await this.userSupabaseClient
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllDocuments:', error);
      return [];
    }
  }
}