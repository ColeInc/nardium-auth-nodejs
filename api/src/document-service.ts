import { supabase } from './supabase-client';
import { DocumentAccess, UserStatus, User } from './types';

/**
 * Free tier document limit
 * Free users are limited to 20 unique documents
 * This limit applies only to new documents - users can revisit
 * previously accessed documents without counting against this limit
 */
// const FREE_TIER_LIMIT = 20;
const FREE_TIER_LIMIT = 2;

/**
 * Document Service
 * 
 * Handles all operations related to document access and user subscription management.
 * Implements document limit enforcement for free tier users.
 */
export class DocumentService {
  /**
   * Records a user's access to a document
   * 
   * The limit enforcement works through the following process:
   * 1. When a user opens a Google Doc, the extension sends the document ID to the backend
   * 2. The backend checks if the document is already in the user's access history
   *    - If yes: access is always granted (doesn't count against limit)
   *    - If no: system checks if user has accessed fewer than 20 unique documents (free tier)
   * 3. For free tier users over the limit, an error is returned
   * 4. Premium users bypass the limit check entirely
   * 
   * This model allows users to revisit documents they've already accessed without restriction
   * while still enforcing the new document limit for free tier users.
   */
  static async recordAccess(
    userId: string,
    documentId: string,
  ): Promise<DocumentAccess> {
    const now = new Date().toISOString();

    // Check if document access already exists
    const { data: existingAccess } = await supabase
      .from('document_access')
      .select()
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .single();

    if (existingAccess) {
      // Update last accessed timestamp
      const { data, error } = await supabase
        .from('document_access')
        .update({ last_accessed_at: now })
        .eq('id', existingAccess.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new document access record
    const { data, error } = await supabase
      .from('document_access')
      .insert({
        user_id: userId,
        document_id: documentId,
        first_accessed_at: now,
        last_accessed_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserStatus(userId: string): Promise<UserStatus> {
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const { count } = await supabase
      .from('document_access')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const documentCount = count || 0;
    const remainingDocuments = user?.subscription_tier === 'premium'
      ? Infinity
      : Math.max(0, FREE_TIER_LIMIT - documentCount);

    return {
      subscription_tier: user?.subscription_tier || 'free',
      document_count: documentCount,
      remaining_documents: remainingDocuments,
    };
  }

  static async getUserDocuments(userId: string): Promise<DocumentAccess[]> {
    const { data, error } = await supabase
      .from('document_access')
      .select('*')
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async upgradeUser(userId: string): Promise<User> {
    // Update the user's subscription tier to premium
    const { data, error } = await supabase
      .from('users')
      .update({ subscription_tier: 'premium' })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
} 