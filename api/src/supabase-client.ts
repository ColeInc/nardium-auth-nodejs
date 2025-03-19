import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Security Model:
 * 
 * This application uses Supabase's Row Level Security (RLS) to ensure data privacy:
 * 
 * 1. Each user can only access their own profile information
 * 2. Each user can only view and modify their own document access records
 * 3. JWT tokens are used to securely identify users across all API calls
 * 4. Database policies restrict data access at the database level, not just the API level
 * 
 * The following RLS policies should be applied in the Supabase dashboard:
 * 
 * For users table:
 * - Enable RLS on the table
 * - Create policy "Users can only read their own data":
 *   - USING expression: (auth.uid() = id)
 *   - Check for operation: SELECT
 * - Create policy "Users can only update their own data":
 *   - USING expression: (auth.uid() = id)
 *   - Check for operation: UPDATE
 * 
 * For document_access table:
 * - Enable RLS on the table
 * - Create policy "Users can only access their own documents":
 *   - USING expression: (auth.uid() = user_id)
 *   - Check for operations: SELECT, INSERT, UPDATE, DELETE
 */ 

// Add these authentication helper functions
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}; 