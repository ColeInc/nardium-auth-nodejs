import { Router } from 'express';
import authRoutes from './auth';
import documentsRoutes from './documents';
import paymentsRoutes from './payments';
import healthRoutes from './health';
import express from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';
import { Request, Response } from 'express';

const router = Router();

// Log when routes are being registered
console.log('Main router - Initializing API routes with modular structure...');

// Add logging middleware to track route selection
router.use((req, res, next) => {
  console.log(`Main router - Route accessed: ${req.originalUrl} ${req.method} ${req.path}`);
  console.log(`Main router - Request headers:`, JSON.stringify(req.headers));
  next();
});

// Apply JSON parsing middleware globally EXCEPT for webhook paths
router.use((req, res, next) => {
  // Skip body parsing for webhook routes - IMPORTANT for signature verification
  if (req.path.includes('/payments/webhook') ||
    req.path.includes('/stripe/webhook') ||
    req.path.includes('/webhooks/stripe')) {
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