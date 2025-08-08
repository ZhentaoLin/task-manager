-- Migration to add description, jira_ticket, and github_pr fields to tasks tables

-- Add columns to the tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS jira_ticket VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_pr VARCHAR(255);

-- Add columns to the completed_tasks table
ALTER TABLE completed_tasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS jira_ticket VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_pr VARCHAR(255);

-- Optional: Create indexes for better query performance on jira and github fields
CREATE INDEX IF NOT EXISTS idx_tasks_jira_ticket ON tasks(jira_ticket);
CREATE INDEX IF NOT EXISTS idx_tasks_github_pr ON tasks(github_pr);
CREATE INDEX IF NOT EXISTS idx_completed_tasks_jira_ticket ON completed_tasks(jira_ticket);
CREATE INDEX IF NOT EXISTS idx_completed_tasks_github_pr ON completed_tasks(github_pr);

-- Create daily_highlights table for storing the highlighted task for each day
CREATE TABLE IF NOT EXISTS daily_highlights (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    task_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance on date
CREATE INDEX IF NOT EXISTS idx_daily_highlights_date ON daily_highlights(date);
CREATE INDEX IF NOT EXISTS idx_daily_highlights_task_id ON daily_highlights(task_id);