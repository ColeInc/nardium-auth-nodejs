import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase clients as singletons to be reused across serverless function invocations
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

// Return the singleton instances directly rather than wrapping them
export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    console.log('Initializing Supabase client');
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: { 'x-connection-type': 'serverless' },
      }
    });
  }
  return _supabase;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!_supabaseAdmin) {
    console.log('Initializing Supabase admin client');
    _supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: { 'x-connection-type': 'serverless' },
        }
      }
    );
  }
  return _supabaseAdmin;
}

// For backward compatibility, export direct references to the singleton instances
// This allows existing code to continue using the chainable query pattern
export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();

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

// Authentication helper functions
export const signInWithGoogle = async () => {
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google'
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await getSupabaseClient().auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await getSupabaseClient().auth.getUser();
  return { user, error };
}; 