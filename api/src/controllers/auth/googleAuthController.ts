import { Response } from 'express';
import { AccessToken, AuthenticateUserResponse, GoogleCallbackRequest } from '../../types/auth';
import { v4 as uuidv4 } from 'uuid';
import { getOrInitResources } from '../../lib/initialization';

/**
 * Google authentication controller functions
 * Refactored to use singleton service instances for serverless optimization
 */
export const googleAuthController = {
  /**
   * Authenticate a user with Google OAuth
   */
  authenticateUser: async (
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

      // Get services from initialization module
      const resources = await getOrInitResources();
      const { googleAuthService, supabaseAuthService, jwtService } = resources;

      console.log('Authenticating with Google...');
      const tokens = await googleAuthService!.authenticateUser(code);
      console.log('Successfully obtained Google tokens');

      console.log('Verifying user info from ID token...');
      const userData = await googleAuthService!.verifyAndGetUserInfo(tokens.id_token);
      console.log(`User info verified for email: ${userData.email}`);

      if (!tokens.refresh_token) {
        console.log('Error: No refresh token received from Google');
        throw new Error('No refresh token received from Google');
      }

      console.log('Encrypting refresh token...');
      const encryptedRefreshToken = await googleAuthService!.encryptRefreshToken(tokens.refresh_token);

      console.log('Creating/updating user in Supabase...');
      console.log('Storing encrypted refresh token in Supabase:', encryptedRefreshToken);
      const user = await supabaseAuthService!.createOrUpdateUser(
        userData.email,
        userData.sub,
        encryptedRefreshToken
      );
      console.log(`User ${user.id} created/updated in Supabase`);

      // Generate a unique session ID
      const sessionId = uuidv4();

      // Create JWT token with user info
      const jwtPayload = {
        user_id: user.id,
        email: user.email,
        sessionId: sessionId,
        subscription_tier: user.subscription_tier
      };
      const jwtToken = jwtService!.createSessionToken(jwtPayload);

      console.log('Authentication process completed successfully');

      const response: AuthenticateUserResponse = {
        success: true,
        jwt_token: jwtToken,
        csrf_token: req.csrfToken ? req.csrfToken() : undefined,
        user: {
          email: user.email,
          sub: userData.sub,
          subscription_tier: user.subscription_tier
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  },

  /**
   * Refresh an access token using stored refresh token
   */
  refreshAccessToken: async (req: any, res: Response): Promise<void> => {
    try {
      console.log('Starting access token refresh process');
      console.log('Request headers:', req.headers);

      // Get user ID from JWT token (which was set in auth_token cookie)
      const userId = req.user?.user_id;
      console.log('User ID from request:', userId);

      if (!userId) {
        console.log('Error: No user ID found in request');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get services
      const resources = await getOrInitResources();
      const { tokenService, googleAuthService } = resources;

      console.log(`Fetching refresh token for user ${userId}`);
      // Get the stored refresh token for this user
      const refreshToken = await tokenService!.getRefreshToken(userId);
      console.log('Refresh token retrieved:', refreshToken ? 'Found' : 'Not found');

      if (!refreshToken) {
        console.log(`Error: No refresh token found for user ${userId}`);
        res.status(401).json({ error: 'No refresh token found' });
        return;
      }

      console.log('Requesting new access token from Google');
      // Use the refresh token to get a new access token from Google
      const newTokens = await googleAuthService!.refreshAccessToken(refreshToken);
      console.log('New tokens received:', newTokens ? 'Success' : 'Failed');

      console.log('Successfully obtained new access token');

      const expiryTime = new Date(Date.now() + (newTokens.expires_in * 1000));

      const response: AccessToken = {
        success: true,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        expiry_time: expiryTime.toISOString(),
        email: req.user?.email,
        userId: req.user?.user_id
      };

      res.json(response);

    } catch (error) {
      console.error('Access token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh access token' });
    }
  },

  /**
   * Log out a user
   */
  logout: async (req: any, res: Response): Promise<void> => {
    try {
      console.log(`Logging out user: ${req.user?.user_id || 'unknown'}`);

      // Get services
      const resources = await getOrInitResources();
      const { jwtService } = resources;

      // Clear the auth cookie
      res.clearCookie('auth_token', jwtService!.getCookieConfig());

      // No need to destroy session since we're not using sessions anymore
      console.log('Logout successful');
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
}; 