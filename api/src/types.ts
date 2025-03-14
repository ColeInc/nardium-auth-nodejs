export interface User {
  id: string;
  email: string;
  created_at: string;
  subscription_tier: 'free' | 'premium';
}

export interface DocumentAccess {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  first_accessed_at: string;
  last_accessed_at: string;
}

export interface UserStatus {
  subscription_tier: 'free' | 'premium';
  document_count: number;
  remaining_documents: number;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  subscription_tier: 'free' | 'premium';
}

export interface ApiError extends Error {
  statusCode?: number;
} 