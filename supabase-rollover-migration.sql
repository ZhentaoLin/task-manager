-- Migration to add task rollover/spillover functionality
-- This allows incomplete tasks to persist in the "Today" view across multiple days

-- Create the task_rollover_status table to track spillover tasks
CREATE TABLE IF NOT EXISTS task_rollover_status (
  id SERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL,
  original_selected_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rollover_reason VARCHAR(50) DEFAULT 'incomplete',
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rollover_active 
  ON task_rollover_status(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rollover_task_id 
  ON task_rollover_status(task_id);

CREATE INDEX IF NOT EXISTS idx_rollover_date 
  ON task_rollover_status(original_selected_date);

-- Add comments for documentation
COMMENT ON TABLE task_rollover_status IS 'Tracks tasks that should persist in Today view even after their selected date has passed';
COMMENT ON COLUMN task_rollover_status.task_id IS 'Reference to the task that is rolling over';
COMMENT ON COLUMN task_rollover_status.original_selected_date IS 'The original date when this task was selected for today';
COMMENT ON COLUMN task_rollover_status.is_active IS 'Whether this task should still appear in Today view';
COMMENT ON COLUMN task_rollover_status.rollover_reason IS 'Why this task is rolling over (incomplete, pinned, etc)';
COMMENT ON COLUMN task_rollover_status.dismissed_at IS 'When the user manually dismissed this spillover task';

-- Grant permissions for Supabase access
GRANT ALL ON task_rollover_status TO anon;
GRANT ALL ON task_rollover_status TO authenticated;
GRANT USAGE ON SEQUENCE task_rollover_status_id_seq TO anon;
GRANT USAGE ON SEQUENCE task_rollover_status_id_seq TO authenticated;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_task_rollover_status_updated_at ON task_rollover_status;
CREATE TRIGGER update_task_rollover_status_updated_at 
  BEFORE UPDATE ON task_rollover_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize rollover records for any existing incomplete tasks selected for previous days
-- This will ensure users don't lose tasks when upgrading
INSERT INTO task_rollover_status (task_id, original_selected_date, rollover_reason)
SELECT DISTINCT 
  s.task_id,
  s.selected_date,
  'incomplete'
FROM selected_for_today s
WHERE s.selected_date < CURRENT_DATE
  AND NOT EXISTS (
    -- Check if task is not completed
    SELECT 1 FROM completed_tasks c WHERE c.id = s.task_id
  )
ON CONFLICT (task_id) DO UPDATE
SET 
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- Output migration summary
DO $$
DECLARE
  rollover_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rollover_count FROM task_rollover_status WHERE is_active = true;
  RAISE NOTICE 'Migration complete. % tasks will roll over to Today view.', rollover_count;
END $$;