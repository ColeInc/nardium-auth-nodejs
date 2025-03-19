import { Request } from 'express';

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
  body: {
    code: string;
  };
  csrfToken(): string;
  session: {
    userId: string;
    email: string;
  };
}

export interface AuthenticatedRequest extends Request {
  session: {
    userId: string;
    email: string;
  }
} 