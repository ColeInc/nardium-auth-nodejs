-- Serverless utility tables
-- Execute this in your Supabase SQL Editor if needed for background processing

-- Job tracking for webhooks and background tasks (optional)
CREATE TABLE IF NOT EXISTS job_queue (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for job processing
CREATE INDEX IF NOT EXISTS job_queue_status_idx ON job_queue (status, scheduled_for);
CREATE INDEX IF NOT EXISTS job_queue_job_type_idx ON job_queue (job_type);

-- RLS Policies
-- Enable Row Level Security
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Job queue - only service role (admin) can access
CREATE POLICY "Job queue admin only" ON job_queue
  USING (auth.role() = 'service_role');

-- Create a function for cleaning up old jobs
-- This can be called by a scheduled CRON job
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Clean up old completed or failed jobs (older than 7 days)
  DELETE FROM job_queue 
  WHERE (status = 'completed' OR status = 'failed') 
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 