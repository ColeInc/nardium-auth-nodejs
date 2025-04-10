import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { googleConfig } from '../../config/auth/google';
import axios from 'axios';
import { EncryptedToken } from '../../types/auth';
import crypto from 'crypto';

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
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

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

    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be defined');
    }
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  async encryptRefreshToken(refreshToken: string): Promise<string> {
    console.log('--> Encrypting refresh token:', refreshToken);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    );

    let encrypted = cipher.update(refreshToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const encryptedToken: EncryptedToken = {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex')
    };

    const result = JSON.stringify(encryptedToken);
    console.log('--> Encrypted result:', result);

    return result;
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
      console.log('Making OAuth token request to Google API');
      const response = await axios.post<AuthResponse>(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Add hardcoded refresh token to the response
      response.data.refresh_token = '1//0gkCfe1XIMpNcCgYIARAAGBASNwF-L9Irz8IR3fHHHeuKmkjAqf9d1tVso5PFX_7iaKMdXdZ_ioo1OsBR7TuSgxPbcRHVkBdRBsM';

      // hardcoded resp for time being
      // const response = {
      //   data: {
      //     access_token: 'ya29.a0AeXRPp7kQUJ04oH5H7g2e-EF830ao_Nmtbl1yAFw0i5G_DaxIOo4InvrgZrrC-9kcOE14pvbMjrL8KcgWA9OBXA_nMItPBP3gpn_dPdDowv4KufAFKJLwEkusY0GdKjz_0egFqmHEQmcNKQVUk6ofvxswWHhJRsx6OigfvwDaCgYKAdESARESFQHGX2MiGRN-ab76BMPCNlww-8mFjA0175',
      //     expires_in: 3599,
      //     refresh_token: '3//0gkCfe1XIMpNcCgYIARAAGBASNwF-L9Irz8IR3fHHHeuKmkjAqf9d1tVso5PFX_7iaKMdXdZ_ioo1OsBR7TuSgxPbcRHVkBdRBsM',
      //     scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/userinfo.email openid',
      //     token_type: 'Bearer',
      //     id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlMTkzZDQ2NDdhYjRhMzU4NWFhOWIyYjNiNDg0YTg3YWE2OGJiNDIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3NjM5Nzg1MTExMjQtMmgxdjBpcXJhYmhsYWI3NjAzdGNiOGxiMnZvb2xkaTQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3NjM5Nzg1MTExMjQtMmgxdjBpcXJhYmhsYWI3NjAzdGNiOGxiMnZvb2xkaTQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDQzMjY5NTQ0MjU0OTc5MDgwMTUiLCJlbWFpbCI6Im5hcmRpdW1hcHBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiIwUmlEb0RtVGt6bzM2N2hualNaUjlBIiwiaWF0IjoxNzQyNTIzODE2LCJleHAiOjE3NDI1Mjc0MTZ9.DnWsrDK1W2-uFOaG46DCWTz-fs-piOdJJq8vy5Z2LYckwG0T-w87eE1ibeyiklBHkdPBU4ay4c2vJwu1GLvjWV7mXlcGWnfiAOFwXFsg1WayLvYXFkcHxwc5MsPHR5dZa_MtX-K3ajXr2TBoaCAX2lCjPwwbAVwvVs5eBk5yKbi0UvOQnneK97yMDFD5ckYIBKK_yBBnOM7BP40IbNcmaSfrg9-Z-49pEAET9D_4b7WeaWoPNKnPT3aW4x_0kzeh2k4vBJkPj2B9N65toWT1nnVxsAbLGDle35cObg0fJyTnvLfgp7S-rQijN4WIKuOpfnP_7Sq8s-qjKhfeB1AwRg'
      //   }
      // };

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
      console.log('[renewAccessToken] START: Beginning token renewal process');
      console.log('[renewAccessToken] Refresh token length:', encryptedRefreshToken?.length || 0);

      // Parse the JSON string into EncryptedToken
      console.log('[renewAccessToken] Attempting to decrypt refresh token');
      let decryptionSuccessful = false;
      let refreshTokenToUse = encryptedRefreshToken;

      console.log('[renewAccessToken] Checking if token is JSON-parseable (encrypted)');
      try {
        // Try to parse as JSON
        const parsedToken = JSON.parse(encryptedRefreshToken);
        console.log('[renewAccessToken] Token is in JSON format:', !!parsedToken);

        if (parsedToken.iv && parsedToken.encrypted && parsedToken.authTag) {
          console.log('[renewAccessToken] Token appears to be encrypted, attempting decryption');
          try {
            // Create decipher with parsed components
            const decipher = crypto.createDecipheriv(
              this.algorithm,
              this.encryptionKey,
              Buffer.from(parsedToken.iv, 'hex')
            );

            decipher.setAuthTag(Buffer.from(parsedToken.authTag, 'hex'));

            let decryptedRefreshToken = decipher.update(
              parsedToken.encrypted,
              'hex',
              'utf8'
            );
            decryptedRefreshToken += decipher.final('utf8');

            console.log('[renewAccessToken] Decryption successful, decrypted token length:', decryptedRefreshToken.length);
            refreshTokenToUse = decryptedRefreshToken;
            decryptionSuccessful = true;
          } catch (decryptError) {
            console.error('[renewAccessToken] Decryption error:', decryptError);
          }
        }
      } catch (parseError) {
        console.log('[renewAccessToken] Token is not in JSON format, using as-is');
      }

      if (!decryptionSuccessful) {
        console.log('[renewAccessToken] Using token as-is (not encrypted or decryption failed)');
      }

      console.log('[renewAccessToken] Preparing request to Google OAuth endpoint');
      const params = new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshTokenToUse
      });

      console.log('[renewAccessToken] Making request to Google OAuth endpoint with:');
      console.log('[renewAccessToken] - client_id:', googleConfig.clientId);
      console.log('[renewAccessToken] - grant_type: refresh_token');
      console.log('[renewAccessToken] - token (first 10 chars):', refreshTokenToUse.substring(0, 10) + '...');

      console.log('[renewAccessToken] Sending request to:', url);
      const response = await axios.post<AuthResponse>(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }).catch(error => {
        console.error('[renewAccessToken] Axios error details:', error.message);
        if (error.response) {
          console.error('[renewAccessToken] Error response status:', error.response.status);
          console.error('[renewAccessToken] Error response data:', error.response.data);
        }
        throw error;
      });

      console.log('[renewAccessToken] Received response from Google OAuth endpoint');
      console.log('[renewAccessToken] Response status:', response.status);
      console.log('[renewAccessToken] Access token received (length):', response.data.access_token?.length || 0);
      console.log('[renewAccessToken] Token type:', response.data.token_type);
      console.log('[renewAccessToken] Expires in:', response.data.expires_in);

      console.log('[renewAccessToken] END: Token renewal process completed successfully');
      return response.data;
    } catch (error) {
      console.error('[renewAccessToken] ERROR: OAuth API Call Error:', error);
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  // Alias for backward compatibility
  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    console.log('[refreshAccessToken] Called, delegating to renewAccessToken');
    console.log('[refreshAccessToken] Input token (length):', refreshToken?.length || 0);

    try {
      const result = await this.renewAccessToken(refreshToken);
      console.log('[refreshAccessToken] Successfully renewed token');
      return result;
    } catch (error) {
      console.error('[refreshAccessToken] Error renewing token:', error);
      throw error;
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