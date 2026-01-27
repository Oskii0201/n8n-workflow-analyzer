-- n8n Workflow Analyzer - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor after creating a new project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- n8n_connections table (replaces localStorage sessions)
CREATE TABLE n8n_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL, -- AES-256 encrypted on server
  description TEXT,
  is_active BOOLEAN DEFAULT false, -- Only one active per user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_connection_name UNIQUE(user_id, name)
);

-- user_preferences table
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- workflow_executions_cache table (for scheduler feature)
CREATE TABLE workflow_executions_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES n8n_connections(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  execution_time_ms INTEGER, -- Execution duration
  executed_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('success', 'error', 'waiting')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_execution UNIQUE(connection_id, workflow_id, executed_at)
);

-- workflow_dependencies table (for dependency analyzer feature)
CREATE TABLE workflow_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES n8n_connections(id) ON DELETE CASCADE,
  parent_workflow_id TEXT NOT NULL, -- Workflow that calls another
  parent_workflow_name TEXT,
  child_workflow_id TEXT NOT NULL, -- Workflow being called
  child_workflow_name TEXT,
  last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_dependency UNIQUE(connection_id, parent_workflow_id, child_workflow_id)
);

-- Indexes for performance
CREATE INDEX idx_connections_user_id ON n8n_connections(user_id);
CREATE INDEX idx_connections_active ON n8n_connections(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_executions_connection_workflow ON workflow_executions_cache(connection_id, workflow_id, executed_at DESC);
CREATE INDEX idx_dependencies_connection ON workflow_dependencies(connection_id);

-- RLS Policies
ALTER TABLE n8n_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_dependencies ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own connections" ON n8n_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON n8n_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON n8n_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON n8n_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own executions" ON workflow_executions_cache FOR SELECT USING (
  EXISTS (SELECT 1 FROM n8n_connections WHERE id = connection_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage own executions" ON workflow_executions_cache FOR ALL USING (
  EXISTS (SELECT 1 FROM n8n_connections WHERE id = connection_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own dependencies" ON workflow_dependencies FOR SELECT USING (
  EXISTS (SELECT 1 FROM n8n_connections WHERE id = connection_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage own dependencies" ON workflow_dependencies FOR ALL USING (
  EXISTS (SELECT 1 FROM n8n_connections WHERE id = connection_id AND user_id = auth.uid())
);

-- Trigger to ensure only one active connection per user
CREATE OR REPLACE FUNCTION ensure_single_active_connection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE n8n_connections
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_active_connection
BEFORE INSERT OR UPDATE ON n8n_connections
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION ensure_single_active_connection();
