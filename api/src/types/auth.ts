import { Request } from 'express';
import { JWTPayload as BaseJWTPayload } from '../types';

export interface JWTPayload {
  sub: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
  user_id?: string;
  subscription_tier?: string;
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

export type GoogleCallbackRequest = Request & {
  query: {
    code?: string | string[];
  };
};

export interface AuthenticatedRequest extends Request {
  user?: BaseJWTPayload;
}

export interface AuthenticateUserResponse {
  success: boolean;
  jwt_token: string;
  csrf_token?: string;
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
