-- Vector Store Setup för Supabase
-- Kör detta i din Supabase SQL Editor för att aktivera vector search

-- Aktivera pgvector-tillägget
CREATE EXTENSION IF NOT EXISTS vector;

-- Skapa documents-tabellen för vector storage
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content text NOT NULL,
    embedding vector(1536) NOT NULL,
    source text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Skapa index för snabb similarity search
CREATE INDEX IF NOT EXISTS idx_documents_embedding
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Ytterligare index för prestanda
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents (source);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);

-- Aktivera Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Ta bort befintliga policies om de finns
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON documents;

-- Skapa policies för CRUD-operationer
CREATE POLICY "Enable all operations for authenticated users" 
ON documents FOR ALL 
TO authenticated 
USING (true);

-- Skapa sökfunktion för vector similarity search
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