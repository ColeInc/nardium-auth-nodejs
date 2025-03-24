import { Response } from 'express';
import { GoogleAuthService } from '../../services/auth/googleAuthService';
import { TokenService } from '../../services/auth/tokenService';
import { GoogleCallbackRequest } from '../../types/auth';
import { EncryptionService } from '../../utils/encryption';
import { SupabaseAuthService } from '../../services/auth/supabaseAuthService';
import { JWTService } from '../../services/auth/jwtService';

export class GoogleAuthController {
  private googleAuthService: GoogleAuthService;
  private tokenService: TokenService;
  private supabaseAuthService: SupabaseAuthService;
  private jwtService: JWTService;

  constructor() {
    const encryptionService = new EncryptionService();
    this.googleAuthService = new GoogleAuthService(encryptionService);
    this.tokenService = new TokenService();
    this.supabaseAuthService = new SupabaseAuthService(encryptionService);
    this.jwtService = new JWTService();
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

      // Create JWT token with user info
      const jwtPayload = {
        user_id: user.id,
        email: user.email,
        sessionId: req.sessionID,
        subscription_tier: user.subscription_tier
      };
      const jwtToken = this.jwtService.createSessionToken(jwtPayload);

      // Set JWT in HTTP-only cookie
      res.cookie('auth_token', jwtToken, this.jwtService.getCookieConfig());
      console.log("successfully set auth_token cookie", jwtToken);

      console.log('Authentication process completed successfully');
      res.json({ 
        success: true,
        csrfToken: req.csrfToken(),
        user: {
          email: user.email,
          sub: userData.sub,
          subscription_tier: user.subscription_tier
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  public refreshAccessToken = async (req: any, res: Response): Promise<void> => {
    try {
      console.log('Starting access token refresh process');
      console.log('Request headers:', req.headers);
      console.log('Request cookies:', req.cookies);
      
      // Get user ID from JWT token (which was set in auth_token cookie)
      const userId = req.user?.user_id;
      console.log('User ID from request:', userId);
      
      if (!userId) {
        console.log('Error: No user ID found in request');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      console.log(`Fetching refresh token for user ${userId}`);
      // Get the stored refresh token for this user
      const refreshToken = await this.tokenService.getRefreshToken(userId);
      console.log('Refresh token retrieved:', refreshToken ? 'Found' : 'Not found');
      
      if (!refreshToken) {
        console.log(`Error: No refresh token found for user ${userId}`);
        res.status(401).json({ error: 'No refresh token found' });
        return;
      }

      console.log('Requesting new access token from Google');
      // Use the refresh token to get a new access token from Google
      const newTokens = await this.googleAuthService.refreshAccessToken(refreshToken);
      console.log('New tokens received:', newTokens ? 'Success' : 'Failed');
      
      console.log('Successfully obtained new access token');
      res.json({
        success: true,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in
      });
      
    } catch (error) {
      console.error('Access token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh access token' });
    }
  };

  // public exchangeToken = async (req: any, res: Response): Promise<void> => {
  //   try {
  //     console.log('Starting token exchange process');
  //     const { token } = req.body;
      
  //     if (!token) {
  //       console.log('Error: No token provided');
  //       res.status(400).json({ error: 'Token is required' });
  //       return;
  //     }

  //     console.log('Verifying token and getting user info...');
  //     const userData = await this.googleAuthService.verifyAndGetUserInfo(token);
      
  //     console.log('Getting user from Supabase...');
  //     const user = await this.supabaseAuthService.getUserByEmail(userData.email);
      
  //     if (!user) {
  //       console.log(`Error: No user found for email ${userData.email}`);
  //       res.status(404).json({ error: 'User not found' });
  //       return;
  //     }

  //     // Create JWT token with user info
  //     const jwtPayload = {
  //       user_id: user.id,
  //       email: user.email,
  //       sessionId: req.sessionID,
  //       subscription_tier: user.subscription_tier
  //     };
  //     const jwtToken = this.jwtService.createSessionToken(jwtPayload);

  //     // Set JWT in HTTP-only cookie
  //     res.cookie('auth_token', jwtToken, this.jwtService.getCookieConfig());

  //     console.log('Token exchange completed successfully');
  //     res.json({
  //       success: true,
  //       user: {
  //         id: user.id,
  //         email: user.email,
  //         subscription_tier: user.subscription_tier
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Token exchange error:', error);
  //     res.status(500).json({ error: 'Token exchange failed' });
  //   }
  // };

  public logout = async (req: any, res: Response): Promise<void> => {
    try {
      console.log(`Logging out user: ${req.session.userId}`);
      
      // Clear the auth cookie
      res.clearCookie('auth_token', this.jwtService.getCookieConfig());
      
      // Destroy the session
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