import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from './auth';
import documentsRoutes from './documents';
import paymentsRoutes from './payments';
import healthRoutes from './health';
import express from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';

const router = Router();

// Log when routes are being registered
console.log('Main router - Initializing API routes with modular structure...');

// Add logging middleware to track route selection
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Main router - Route accessed: ${req.originalUrl} ${req.method} ${req.path}`);

  // Debug authorization header presence (without exposing token)
  const hasAuth = !!req.headers.authorization;
  console.log(`Main router - Auth header present: ${hasAuth}`);

  // For debugging, log headers in a safe way
  const safeHeaders = {
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 30) + '...',
    'authorization': req.headers.authorization ? 'Bearer <token>' : undefined
  };
  console.log('Main router - Request headers:', safeHeaders);

  next();
});

// Apply JSON parsing middleware globally EXCEPT for webhook paths
router.use((req: Request, res: Response, next: NextFunction) => {
  // Skip body parsing for webhook routes - IMPORTANT for signature verification
  if (req.path.includes('/payments/webhook') ||
    req.path.includes('/stripe/webhook') ||
    req.path.includes('/webhooks/stripe') ||
    (req as any)._isWebhook === true) {
    console.log('Main router - Skipping body parsing for webhook path:', req.path);
    return next();
  }

  // Apply JSON parsing for all other routes
  console.log(`Main router - Applying JSON parsing middleware for path:`, req.path);
  express.json()(req, res, next);
});

// IMPORTANT: Register direct routes at the root level for Chrome extension critical paths
// This ensures they're caught regardless of path rewriting issues
console.log('Main router - Registering critical direct routes');

// Direct route for Google callback
router.get('/auth/google/callback', (req: Request, res: Response) => {
  console.log('Main router - DIRECT Google callback route hit with query params:', req.query);
  console.log('Main router - DIRECT Google callback full URL:', req.originalUrl);
  console.log('Main router - DIRECT Path:', req.path);
  console.log('Main router - DIRECT Headers:', {
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer
  });

  // For Vercel serverless, ensure query params are properly attached
  if (Object.keys(req.query).length === 0 && req.originalUrl && req.originalUrl.includes('?')) {
    console.log('Main router - No query params found but URL contains query string, attempting to parse');
    try {
      const urlParts = req.originalUrl.split('?');
      if (urlParts.length > 1) {
        const queryString = urlParts[1];
        const params = new URLSearchParams(queryString);

        // If code parameter exists in the URL but not in req.query, add it manually
        const code = params.get('code');
        if (code) {
          console.log('Main router - Manually adding code param:', code);
          (req.query as any).code = code;
        }
      }
    } catch (error) {
      console.error('Main router - Error parsing query string:', error);
    }
  }

  return googleAuthController.authenticateUser(req as any, res);
});

// Direct route for refresh token
router.get('/auth/google/refresh-token', validateApiRequest, (req: Request, res: Response) => {
  console.log('Main router - DIRECT refresh token route hit for user:', (req as any).user?.user_id);
  return googleAuthController.refreshAccessToken(req as any, res);
});

// Mount modular routes
console.log('Main router - Mounting /auth routes');
router.use('/auth', authRoutes);
console.log('Main router - Mounting /documents routes');
router.use('/documents', documentsRoutes);
console.log('Main router - Mounting /payments routes');
router.use('/payments', paymentsRoutes);
console.log('Main router - Mounting /health routes');
router.use('/health', healthRoutes);

console.log('Main router - API routes initialized successfully');

export default router; 