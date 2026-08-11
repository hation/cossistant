-- Update vector dimension from 1536 to 2048 for doubao-embedding-vision

-- First drop the existing HNSW index
DROP INDEX IF EXISTS chunk_embedding_idx;

-- Alter the column to 2048 dimensions
ALTER TABLE chunk ALTER COLUMN embedding TYPE vector(2048);

-- Recreate the HNSW index
CREATE INDEX chunk_embedding_idx ON chunk USING hnsw (embedding vector_cosine_ops);
