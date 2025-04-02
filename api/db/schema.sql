-- Schema for the Nardium Auth API

-- Users table with auth and subscription data
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'subscriber')),
  stripe_customer_id TEXT UNIQUE
);

-- Row-level security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data only
CREATE POLICY users_read_own_data ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update limited fields on their own data only
CREATE POLICY users_update_own_data ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Don't allow users to change their subscription tier directly
    -- This can only be modified by webhooks/admin functions
    (OLD.subscription_tier = NEW.subscription_tier OR auth.role() = 'service_role')
  );

-- Document access tracking
CREATE TABLE IF NOT EXISTS document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  first_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, document_id)
);

-- Row-level security policies
ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own document access records only
CREATE POLICY document_access_read_own_data ON document_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own document access records only
CREATE POLICY document_access_insert_own_data ON document_access
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own document access records only
CREATE POLICY document_access_update_own_data ON document_access
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update last_accessed timestamp
CREATE OR REPLACE FUNCTION update_last_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating last_accessed_at on document_access
CREATE TRIGGER update_last_accessed_at_trigger
BEFORE UPDATE ON document_access
FOR EACH ROW
EXECUTE FUNCTION update_last_accessed_at(); 