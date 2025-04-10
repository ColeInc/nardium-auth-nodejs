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
      console.log('REQUEST OBJECT:', {
        query: req.query,
        headers: {
          ...req.headers,
          authorization: req.headers.authorization ? 'Bearer <token>' : 'none'
        },
        url: req.url,
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        // Raw request properties that might help diagnose Vercel-specific issues
        rawVercelProps: {
          body: !!req.body,
          params: req.params,
          // Check for Vercel-specific properties
          vercelProps: (req as any)._vercel || 'none'
        }
      });

      // Try to get code from multiple possible locations
      let code: string | undefined;

      if (req.query && req.query.code) {
        // Standard way - from query params
        code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
        console.log('Found code in req.query.code:', !!code);
      } else if ((req as any).rawQuery) {
        // Try Vercel-specific raw query string
        const rawQuery = (req as any).rawQuery;
        console.log('No code in req.query, trying rawQuery:', rawQuery);
        const params = new URLSearchParams(rawQuery);
        code = params.get('code') || undefined;
      } else if (req.url && req.url.includes('code=')) {
        // Try parsing from URL if query object is missing but URL has code
        console.log('No query object, trying to parse from URL:', req.url);
        const urlObj = new URL(req.url, 'http://localhost');
        code = urlObj.searchParams.get('code') || undefined;
      } else if ((req as any)._originalUrl && (req as any)._originalUrl.includes('code=')) {
        // Try parsing from _originalUrl set by serverless handler
        console.log('Trying to parse from _originalUrl:', (req as any)._originalUrl);
        const urlStr = (req as any)._originalUrl;
        const queryStart = urlStr.indexOf('?');
        if (queryStart > -1) {
          const queryStr = urlStr.substring(queryStart + 1);
          const params = new URLSearchParams(queryStr);
          code = params.get('code') || undefined;
        }
      }

      if (!code || typeof code !== 'string') {
        console.log('Error: No authorization code provided or invalid format');
        console.log('Request details for debugging:', {
          url: req.url,
          query: req.query,
          headers: Object.keys(req.headers)
        });
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
      console.log('[refreshAccessToken] START: Beginning access token refresh process');
      console.log('[refreshAccessToken] Request path:', req.path);
      console.log('[refreshAccessToken] Request headers:', JSON.stringify(req.headers));

      // Get user ID from JWT token (which was set in auth_token cookie)
      const userId = req.user?.user_id;
      console.log('[refreshAccessToken] User ID from request:', userId);

      if (!userId) {
        console.log('[refreshAccessToken] Error: No user ID found in request');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get services
      console.log('[refreshAccessToken] Getting resources...');
      const resources = await getOrInitResources();
      console.log('[refreshAccessToken] Resources initialized');

      const { tokenService, googleAuthService } = resources;
      console.log('[refreshAccessToken] Token service available:', !!tokenService);
      console.log('[refreshAccessToken] Google auth service available:', !!googleAuthService);

      if (!tokenService || !googleAuthService) {
        console.error('[refreshAccessToken] Required services not available');
        res.status(500).json({ error: 'Server error: Services not initialized' });
        return;
      }

      console.log(`[refreshAccessToken] Fetching refresh token for user ${userId}`);
      // Get the stored refresh token for this user
      const refreshToken = await tokenService.getRefreshToken(userId);
      console.log('[refreshAccessToken] Refresh token retrieved:', refreshToken ? 'Found (length: ' + refreshToken.length + ')' : 'Not found');

      if (!refreshToken) {
        console.log(`[refreshAccessToken] Error: No refresh token found for user ${userId}`);
        res.status(401).json({ error: 'No refresh token found' });
        return;
      }

      console.log('[refreshAccessToken] Requesting new access token from Google');
      // Use the refresh token to get a new access token from Google
      const newTokens = await googleAuthService.refreshAccessToken(refreshToken);
      console.log('[refreshAccessToken] New tokens received:', newTokens ? 'Success' : 'Failed');
      console.log('[refreshAccessToken] Access token length:', newTokens.access_token?.length || 0);

      console.log('[refreshAccessToken] Successfully obtained new access token');

      const expiryTime = new Date(Date.now() + (newTokens.expires_in * 1000));
      console.log('[refreshAccessToken] Token expiry time:', expiryTime.toISOString());

      const response: AccessToken = {
        success: true,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        expiry_time: expiryTime.toISOString(),
        email: req.user?.email,
        userId: req.user?.user_id
      };

      console.log('[refreshAccessToken] END: Sending successful response');
      res.json(response);

    } catch (error) {
      console.error('[refreshAccessToken] Access token refresh error:', error);
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