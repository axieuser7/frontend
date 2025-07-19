import { supabase } from './supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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
  private openai: OpenAI | null = null;

  async initializeUserSupabase(projectUrl: string, anonKey: string): Promise<SupabaseClient> {
    this.userSupabaseClient = createClient(projectUrl, anonKey);
    return this.userSupabaseClient;
  }

  setOpenAIKey(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async createVectorTables(projectUrl: string, serviceKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const adminClient = createClient(projectUrl, serviceKey);

      const sql = `
        -- Enable pgvector extension
        CREATE EXTENSION IF NOT EXISTS vector;

        -- Create documents table with proper structure
        -- Create documents table
        CREATE TABLE IF NOT EXISTS documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            content text NOT NULL,
            embedding vector(1536) NOT NULL,
            source text,
            metadata jsonb,
            created_at timestamptz DEFAULT now()
        );

        -- Create index for fast similarity search (only if table has data)
        CREATE INDEX IF NOT EXISTS idx_documents_embedding
        ON documents
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);

        -- Additional indexes for performance
        CREATE INDEX IF NOT EXISTS idx_documents_source ON documents (source);
        CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);

        -- Enable RLS
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
        
        -- Create policies for different operations
        CREATE POLICY "Enable read access for all users" ON documents
        FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for all users" ON documents
        FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Enable update for all users" ON documents
        FOR UPDATE USING (true);
        
        CREATE POLICY "Enable delete for all users" ON documents
        FOR DELETE USING (true);

        -- Create search function
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

      // Execute SQL in smaller chunks to avoid issues
      const sqlCommands = sql.split(';').filter(cmd => cmd.trim());
      
      for (const command of sqlCommands) {
        if (command.trim()) {
          const { error } = await adminClient.rpc('sql', { query: command.trim() + ';' });
          if (error) {
            console.warn('SQL command warning:', error.message);
            // Continue with other commands even if one fails
          }
        }
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
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
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
      
      // Ensure embedding is properly formatted
      const embeddingArray = Array.isArray(embedding) ? embedding : [];
      if (embeddingArray.length !== 1536) {
        throw new Error(`Invalid embedding dimension: ${embeddingArray.length}, expected 1536`);
      }

      // Insert document
      const { data, error } = await this.userSupabaseClient
        .from('documents')
        .insert({
          content,
          embedding: embeddingArray,
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
      
      // Ensure embedding is properly formatted
      const embeddingArray = Array.isArray(queryEmbedding) ? queryEmbedding : [];
      if (embeddingArray.length !== 1536) {
        throw new Error(`Invalid query embedding dimension: ${embeddingArray.length}, expected 1536`);
      }

      // Search for similar documents
      const { data, error } = await this.userSupabaseClient.rpc('search_documents', {
        query_embedding: embeddingArray,
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