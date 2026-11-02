-- Create necessary PostgreSQL extensions
-- This script runs during container initialization

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable advanced indexing
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enable JSON functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log successful extension creation
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL extensions created successfully';
END $$;