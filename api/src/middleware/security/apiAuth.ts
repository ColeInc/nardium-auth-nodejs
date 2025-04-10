import { Request, Response, NextFunction } from 'express';
import { getResources } from '../../lib/initialization';

/**
 * Middleware to validate API requests using JWT tokens
 * Optimized for serverless environment with resource reuse
 */
export function validateApiRequest(
  req: Request | any, // Using any to accommodate both Express.Request and VercelRequest
  res: Response,
  next: NextFunction
): void {
  console.log('[validateApiRequest] START: Validating API request');
  console.log('[validateApiRequest] Request path:', req.path);
  console.log('[validateApiRequest] Request headers:', JSON.stringify(req.headers));

  try {
    // Get JWT token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    console.log('[validateApiRequest] Authorization header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[validateApiRequest] Authorization header missing or invalid format');
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    console.log('[validateApiRequest] Token extracted, length:', token.length);

    // Initialize resources if not already initialized
    console.log('[validateApiRequest] Getting resources...');
    const resources = getResources();
    console.log('[validateApiRequest] Resources fetched, available:', !!resources);

    const jwtService = resources?.jwtService;
    console.log('[validateApiRequest] JWT service available:', !!jwtService);

    if (!jwtService) {
      console.error('[validateApiRequest] JWT service not initialized');
      res.status(500).json({ error: 'Server error: Authentication service unavailable' });
      return;
    }

    try {
      console.log('[validateApiRequest] Verifying JWT token...');
      // Verify JWT token
      const payload = jwtService.verifyToken(token);
      console.log('[validateApiRequest] Token verified successfully for user:', payload.user_id);

      // Add user data to request
      req.user = {
        user_id: payload.user_id,
        email: payload.email,
        sessionId: payload.sessionId,  // Include sessionId from payload
        subscription_tier: payload.subscription_tier
      };
      console.log('[validateApiRequest] User data added to request:', JSON.stringify(req.user));

      // Check if token needs refresh (handled by client)
      console.log('[validateApiRequest] Checking if token needs refresh...');
      const refreshedToken = jwtService.refreshTokenIfNeeded(token);
      if (refreshedToken) {
        console.log('[validateApiRequest] Token refreshed, setting header');
        res.setHeader('X-New-Token', refreshedToken);
      } else {
        console.log('[validateApiRequest] Token does not need refresh');
      }

      console.log('[validateApiRequest] END: Validation successful, proceeding to next middleware');
      next();
    } catch (tokenError) {
      console.error('[validateApiRequest] Token validation failed:', tokenError);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('[validateApiRequest] Authentication error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
} 