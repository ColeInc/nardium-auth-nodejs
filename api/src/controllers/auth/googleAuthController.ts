import { Response } from 'express';
import { GoogleAuthService } from '../../services/auth/googleAuthService';
import { TokenService } from '../../services/auth/tokenService';
import { GoogleCallbackRequest } from '../../types/auth';
import { EncryptionService } from '../../utils/encryption';
import { SupabaseAuthService } from '../../services/auth/supabaseAuthService';

export class GoogleAuthController {
  private googleAuthService: GoogleAuthService;
  private tokenService: TokenService;
  private supabaseAuthService: SupabaseAuthService;

  constructor() {
    const encryptionService = new EncryptionService();
    this.googleAuthService = new GoogleAuthService(encryptionService);
    this.tokenService = new TokenService();
    this.supabaseAuthService = new SupabaseAuthService(encryptionService);
  }

  public handleCallback = async (
    req: GoogleCallbackRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { code } = req.body;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code is required' });
        return;
      }

      // Get tokens from Google
      const tokens = await this.googleAuthService.authenticateUser(code);
      const userData = await this.googleAuthService.verifyAndGetUserInfo(tokens.id_token);
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received from Google');
      }

      // Encrypt the refresh token before storing
      const encryptedRefreshToken = await this.googleAuthService.encryptRefreshToken(tokens.refresh_token);

      // Create or update user in Supabase
      const user = await this.supabaseAuthService.createOrUpdateUser(
        userData.email,
        userData.sub,
        encryptedRefreshToken
      );

      // Store refresh token in our token service
      await this.tokenService.storeRefreshToken(user.id, tokens.refresh_token);

      // Set session data
      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({ 
        success: true,
        csrfToken: req.csrfToken(),
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // ... rest of the controller methods
}

export const googleAuthController = new GoogleAuthController(); 