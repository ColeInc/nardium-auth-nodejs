import { Request, Response, NextFunction } from 'express';
import { getResources } from '../../lib/initialization';

/**
 * Helper function to extract authorization from various header locations
 * This is particularly useful for Vercel serverless environments where
 * headers might be available in non-standard locations
 */
function extractAuthHeader(req: any): string | null {
  // Check all possible locations for the authorization header
  if (req.headers.authorization) {
    return req.headers.authorization;
  }
  if (req.headers['x-authorization']) {
    return req.headers['x-authorization'];
  }
  if (req.headers['x-forwarded-authorization']) {
    return req.headers['x-forwarded-authorization'];
  }
  if (req._originalHeaders?.authorization) {
    return req._originalHeaders.authorization;
  }
  // Cookie-based fallback if applicable
  if (req.cookies?.auth_token) {
    return `Bearer ${req.cookies.auth_token}`;
  }

  // Also check for raw token in header without Bearer prefix
  if (req.headers['authorization-token']) {
    return `Bearer ${req.headers['authorization-token']}`;
  }

  // Special case for query param token (only use in dev or when explicitly enabled)
  const isDevEnv = process.env.NODE_ENV === 'development';
  const isQueryTokenEnabled = process.env.ALLOW_QUERY_TOKEN === 'true';
  if ((isDevEnv || isQueryTokenEnabled) && req.query?.token) {
    return `Bearer ${req.query.token}`;
  }

  return null;
}

/**
 * Check if we're running in a Vercel environment
 */
function isVercelEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
}

/**
 * Middleware to validate API requests using JWT tokens
 * Optimized for serverless environment with resource reuse
 */
export function validateApiRequest(
  req: Request | any, // Using any to accommodate both Express.Request and VercelRequest
  res: Response,
  next: NextFunction
): void {
  const inVercel = isVercelEnvironment();
  console.log('[validateApiRequest] Running in Vercel environment:', inVercel);
  console.log('[validateApiRequest] START: Validating API request');
  console.log('[validateApiRequest] Request path:', req.path);
  console.log('[validateApiRequest] Headers keys:', Object.keys(req.headers));

  try {
    // Use the helper function to extract the authorization header
    const authHeader = extractAuthHeader(req);

    if (authHeader) {
      console.log('[validateApiRequest] Authorization header found');
    } else {
      console.log('[validateApiRequest] Authorization header not found in any expected location');
    }

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
      // Log which parts of the request might be faulty
      console.error('[validateApiRequest] Debug info:', {
        urlInfo: {
          url: req.url,
          path: req.path,
          originalUrl: req.originalUrl
        },
        headers: Object.keys(req.headers),
        hasOriginalHeaders: !!req._originalHeaders,
        vercelSpecific: {
          hasVercelId: !!req.headers['x-vercel-id'],
          forwardedFor: req.headers['x-forwarded-for'] || 'none'
        }
      });
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('[validateApiRequest] Authentication error:', error);
    console.error('[validateApiRequest] Request details at error time:', {
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers),
      cookies: !!req.cookies
    });

    // Log Vercel-specific environment information to help with debugging
    if (isVercelEnvironment()) {
      console.error('[validateApiRequest] Vercel environment details:', {
        vercelEnv: process.env.VERCEL_ENV || 'unknown',
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'unknown',
        deploymentUrl: process.env.VERCEL_DEPLOYMENT_URL || 'unknown',
        hasVercelId: !!req.headers['x-vercel-id'],
        vercelProxy: !!req.headers['x-vercel-proxy'] || 'unknown',
        vercelForwarded: req.headers['x-forwarded-host'] || 'unknown'
      });
    }

    res.status(500).json({ error: 'Server error during authentication' });
  }
} 