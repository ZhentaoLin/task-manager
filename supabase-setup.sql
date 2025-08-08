-- Supabase SQL setup - Run this in your Supabase SQL editor

-- Tasks table
CREATE TABLE tasks (
  id BIGINT PRIMARY KEY,
  text TEXT NOT NULL,
  parent_id BIGINT,
  parent_text TEXT,
  level INTEGER DEFAULT 0,
  description TEXT,
  jira_ticket TEXT,
  github_pr TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Completed tasks table
CREATE TABLE completed_tasks (
  id BIGINT PRIMARY KEY,
  text TEXT NOT NULL,
  parent_id BIGINT,
  parent_text TEXT,
  level INTEGER DEFAULT 0,
  description TEXT,
  jira_ticket TEXT,
  github_pr TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Selected for today table
CREATE TABLE selected_for_today (
  id SERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL
);

-- Enable Row Level Security (optional, for multi-user later)
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE completed_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE selected_for_today ENABLE ROW LEVEL SECURITY;

-- For now, allow public access (single user)
-- You can add auth policies later if needed