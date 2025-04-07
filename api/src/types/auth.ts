import { Request } from 'express';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
  }
}

export interface JWTPayload {
  sub: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  id_token: string;
  expiry_date: number;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

export interface EncryptedToken {
  iv: string;
  encrypted: string;
  authTag: string;
}

export interface GoogleCallbackRequest extends Request {
  query: {
    code?: string | string[];
  };
  csrfToken(): string;
  sessionID: string;
}

export interface AuthenticatedRequest extends Request {
}

export interface AuthenticateUserResponse {
  success: boolean;
  jwt_token: string;
  csrf_token: string;
  user: {
    email: string;
    sub: string;
    subscription_tier?: string;
  }
}

export interface AccessToken {
  success: boolean;
  access_token: string;
  expires_in: number;
  expiry_time: string;
  email?: string;
  userId?: string;
}
