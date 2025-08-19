-- Migration to add date tracking to selected_for_today table
-- This ensures tasks selected for "today" are tied to specific dates

-- First, backup existing data (if any)
CREATE TEMP TABLE selected_for_today_backup AS SELECT * FROM selected_for_today;

-- Drop the old table
DROP TABLE IF EXISTS selected_for_today;

-- Create new table with date column
CREATE TABLE selected_for_today (
  id SERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL,
  selected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_selected_for_today_date ON selected_for_today(selected_date);
CREATE INDEX idx_selected_for_today_task_id ON selected_for_today(task_id);
CREATE UNIQUE INDEX idx_selected_for_today_unique ON selected_for_today(task_id, selected_date);

-- Restore data from backup with today's date
INSERT INTO selected_for_today (task_id, selected_date)
SELECT task_id, CURRENT_DATE FROM selected_for_today_backup;

-- Drop the backup table
DROP TABLE selected_for_today_backup;

-- Add a comment to document the purpose
COMMENT ON TABLE selected_for_today IS 'Tracks which tasks are selected for specific dates';
COMMENT ON COLUMN selected_for_today.selected_date IS 'The date for which this task was selected';