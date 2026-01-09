-- ============================================
-- Today in Biology - Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PAPERS TABLE
-- Stores fetched biology papers with metadata and scores
-- ============================================
CREATE TABLE papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    abstract TEXT,
    source TEXT NOT NULL,           -- e.g., "biorxiv", "medrxiv"
    doi TEXT UNIQUE,                -- Digital Object Identifier
    authors TEXT,                   -- Comma-separated author names
    category TEXT,                  -- Subject category
    score INTEGER DEFAULT 0,        -- Excitement score (calculated)
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying by date and score
CREATE INDEX idx_papers_published_at ON papers(published_at DESC);
CREATE INDEX idx_papers_score ON papers(score DESC);

-- ============================================
-- DAILY_STORY TABLE
-- Stores AI-generated blog posts
-- ============================================
CREATE TABLE daily_story (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,          -- The generated blog post
    paper_ids UUID[] NOT NULL,      -- References to source papers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for getting the latest story
CREATE INDEX idx_daily_story_created_at ON daily_story(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- Allow public read access (no auth required for frontend)
-- ============================================

-- Enable RLS
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_story ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Allow public read access on papers"
    ON papers FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow public read access on daily_story"
    ON daily_story FOR SELECT
    TO anon
    USING (true);

-- Service role can insert/update (for Edge Functions)
CREATE POLICY "Allow service role full access on papers"
    ON papers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access on daily_story"
    ON daily_story FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
