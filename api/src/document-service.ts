import { supabase } from './supabase-client';
import { DocumentAccess, UserStatus } from './types';

const FREE_TIER_LIMIT = 20;

export class DocumentService {
  static async recordAccess(
    userId: string,
    documentId: string,
    documentTitle: string
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
        document_title: documentTitle,
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
} 