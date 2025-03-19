import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { googleConfig } from '../../config/auth/google';
import axios from 'axios';
import { EncryptionService } from '../../utils/encryption';

interface AuthResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token: string;
}

interface EncryptionService {
  encrypt(text: string): EncryptedToken;
  decrypt(encryptedText: EncryptedToken): string;
}

interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

export class GoogleAuthService {
  private oauth2Client: any;
  private authClient: OAuth2Client;
  private encryptionService: EncryptionService;

  constructor(encryptionService: EncryptionService) {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
    this.authClient = new OAuth2Client(googleConfig.clientId);
    this.encryptionService = encryptionService;
  }

  async encryptRefreshToken(refreshToken: string): Promise<string> {
    const encrypted = await this.encryptionService.encrypt(refreshToken);
    return encrypted.toString();
  }

  async authenticateUser(code: string): Promise<AuthResponse> {
    const url = 'https://www.googleapis.com/oauth2/v4/token';
    const params = new URLSearchParams({
      code,
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      redirect_uri: googleConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await axios.post<AuthResponse>(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const responseData = response.data;
      console.log('oauth response:', responseData);

      // Encrypt refresh token if present
      if (responseData.refresh_token) {
        const encryptedRefreshToken = this.encryptionService.encrypt(responseData.refresh_token);
        responseData.refresh_token = encryptedRefreshToken.encrypted;
      }

      console.log('oauth response UPDATED W/ ENCRYPTED REFRESH:', responseData);
      return responseData;
    } catch (error) {
      console.error('OAuth API Call Error:', error);
      throw new Error('Failed to authenticate user');
    }
  }

  async renewAccessToken(encryptedRefreshToken: string): Promise<AuthResponse> {
    const url = 'https://oauth2.googleapis.com/token';
    
    try {
      const decryptedRefreshToken = this.encryptionService.decrypt({
        iv: encryptedRefreshToken.substring(0, 32),
        encrypted: encryptedRefreshToken.substring(32, -16),
        authTag: encryptedRefreshToken.substring(-16)
      });
      
      if (!decryptedRefreshToken) {
        throw new Error('Failed to decrypt refresh_token');
      }

      console.log('decrypted:', decryptedRefreshToken);

      const params = new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken
      });

      const response = await axios.post<AuthResponse>(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('refreshToken swap RAW:', response.data);
      return response.data;
    } catch (error) {
      console.error('OAuth API Call Error:', error);
      throw new Error(`Failed to renew access token: ${error}`);
    }
  }

  async verifyAndGetUserInfo(idToken: string): Promise<UserInfo> {
    try {
      const ticket = await this.authClient.verifyIdToken({
        idToken,
        audience: googleConfig.clientId
      });
      return ticket.getPayload() as UserInfo;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Failed to verify token');
    }
  }

  // ... rest of the service methods
} 