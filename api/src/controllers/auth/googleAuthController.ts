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

  public authenticateUser = async (
    req: GoogleCallbackRequest,
    res: Response
  ): Promise<void> => {
    try {
      console.log('Starting Google OAuth callback handling');
      const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
      
      if (!code || typeof code !== 'string') {
        console.log('Error: No authorization code provided or invalid format');
        res.status(400).json({ error: 'Authorization code is required' });
        return;
      }

      console.log('Authenticating with Google...');
      const tokens = await this.googleAuthService.authenticateUser(code);
      console.log('Successfully obtained Google tokens');
      
      console.log('Verifying user info from ID token...');
      const userData = await this.googleAuthService.verifyAndGetUserInfo(tokens.id_token);
      console.log(`User info verified for email: ${userData.email}`);
      
      if (!tokens.refresh_token) {
        console.log('Error: No refresh token received from Google');
        throw new Error('No refresh token received from Google');
      }

      console.log('Encrypting refresh token...');
      const encryptedRefreshToken = await this.googleAuthService.encryptRefreshToken(tokens.refresh_token);

      console.log('Creating/updating user in Supabase...');
      const user = await this.supabaseAuthService.createOrUpdateUser(
        userData.email,
        userData.sub,
        encryptedRefreshToken
      );
      console.log(`User ${user.id} created/updated in Supabase`);

      console.log('Storing refresh token...');
      await this.tokenService.storeRefreshToken(user.id, tokens.refresh_token);

      console.log('Setting session data...');
      req.session.userId = user.id;
      req.session.email = user.email;

      console.log('Authentication process completed successfully');
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

  public exchangeToken = async (req: any, res: Response): Promise<void> => {
    try {
      console.log('Starting token exchange process');
      const { token } = req.body;
      
      if (!token) {
        console.log('Error: No token provided');
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      console.log('Verifying token and getting user info...');
      const userData = await this.googleAuthService.verifyAndGetUserInfo(token);
      
      console.log('Getting user from Supabase...');
      const user = await this.supabaseAuthService.getUserByEmail(userData.email);
      
      if (!user) {
        console.log(`Error: No user found for email ${userData.email}`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      console.log('Setting session data...');
      req.session.userId = user.id;
      req.session.email = user.email;

      console.log('Token exchange completed successfully');
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier
        }
      });
    } catch (error) {
      console.error('Token exchange error:', error);
      res.status(500).json({ error: 'Token exchange failed' });
    }
  };

  public logout = async (req: any, res: Response): Promise<void> => {
    try {
      console.log(`Logging out user: ${req.session.userId}`);
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destruction error:', err);
          throw err;
        }
        console.log('Logout successful');
        res.json({ success: true });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  };
}

export const googleAuthController = new GoogleAuthController(); 