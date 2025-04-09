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
  try {
    console.log('Validating API request');
    // Get JWT token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authorization header missing or invalid format');
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Initialize resources if not already initialized
    const resources = getResources();
    const jwtService = resources.jwtService;

    if (!jwtService) {
      console.error('JWT service not initialized');
      res.status(500).json({ error: 'Server error: Authentication service unavailable' });
      return;
    }

    try {
      // Verify JWT token
      const payload = jwtService.verifyToken(token);

      // Add user data to request
      req.user = {
        user_id: payload.user_id,
        email: payload.email,
        sessionId: payload.sessionId,  // Include sessionId from payload
        subscription_tier: payload.subscription_tier
      };

      // Check if token needs refresh (handled by client)
      const refreshedToken = jwtService.refreshTokenIfNeeded(token);
      if (refreshedToken) {
        res.setHeader('X-New-Token', refreshedToken);
      }

      next();
    } catch (tokenError) {
      console.error('Token validation failed:', tokenError);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
} 