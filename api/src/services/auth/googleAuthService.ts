import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { googleConfig } from '../../config/auth/google';
import axios from 'axios';
import { EncryptedToken } from '../../types/auth';

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
    console.log('OAuth2 client initialized with:', {
      clientId: googleConfig.clientId,
      redirectUri: googleConfig.redirectUri,
      scopes: googleConfig.scopes
    });
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
      // UNCOMMENT DIS
      // UNCOMMENT DIS
      // UNCOMMENT DIS
      // const response = await axios.post<AuthResponse>(url, params.toString(), {
      //   headers: {
      //     'Content-Type': 'application/x-www-form-urlencoded'
      //   }
      // });

      // hardcoded resp for time being
      const response = {
        data: {
          access_token: 'ya29.a0AeXRPp7kQUJ04oH5H7g2e-EF830ao_Nmtbl1yAFw0i5G_DaxIOo4InvrgZrrC-9kcOE14pvbMjrL8KcgWA9OBXA_nMItPBP3gpn_dPdDowv4KufAFKJLwEkusY0GdKjz_0egFqmHEQmcNKQVUk6ofvxswWHhJRsx6OigfvwDaCgYKAdESARESFQHGX2MiGRN-ab76BMPCNlww-8mFjA0175',
          expires_in: 3599,
          refresh_token: '3//0gkCfe1XIMpNcCgYIARAAGBASNwF-L9Irz8IR3fHHHeuKmkjAqf9d1tVso5PFX_7iaKMdXdZ_ioo1OsBR7TuSgxPbcRHVkBdRBsM',
          scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/userinfo.email openid',
          token_type: 'Bearer',
          id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlMTkzZDQ2NDdhYjRhMzU4NWFhOWIyYjNiNDg0YTg3YWE2OGJiNDIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3NjM5Nzg1MTExMjQtMmgxdjBpcXJhYmhsYWI3NjAzdGNiOGxiMnZvb2xkaTQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3NjM5Nzg1MTExMjQtMmgxdjBpcXJhYmhsYWI3NjAzdGNiOGxiMnZvb2xkaTQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDQzMjY5NTQ0MjU0OTc5MDgwMTUiLCJlbWFpbCI6Im5hcmRpdW1hcHBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiIwUmlEb0RtVGt6bzM2N2hualNaUjlBIiwiaWF0IjoxNzQyNTIzODE2LCJleHAiOjE3NDI1Mjc0MTZ9.DnWsrDK1W2-uFOaG46DCWTz-fs-piOdJJq8vy5Z2LYckwG0T-w87eE1ibeyiklBHkdPBU4ay4c2vJwu1GLvjWV7mXlcGWnfiAOFwXFsg1WayLvYXFkcHxwc5MsPHR5dZa_MtX-K3ajXr2TBoaCAX2lCjPwwbAVwvVs5eBk5yKbi0UvOQnneK97yMDFD5ckYIBKK_yBBnOM7BP40IbNcmaSfrg9-Z-49pEAET9D_4b7WeaWoPNKnPT3aW4x_0kzeh2k4vBJkPj2B9N65toWT1nnVxsAbLGDle35cObg0fJyTnvLfgp7S-rQijN4WIKuOpfnP_7Sq8s-qjKhfeB1AwRg'
        }
      };

      const responseData = response.data;
      console.log('oauth response:', responseData);

      // Encrypt refresh token if present
      // if (responseData.refresh_token) {
      //   const encryptedRefreshToken = this.encryptionService.encrypt(responseData.refresh_token);
      //   responseData.refresh_token = encryptedRefreshToken.encrypted;
      // }

      // console.log('oauth response UPDATED W/ ENCRYPTED REFRESH:', responseData);
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