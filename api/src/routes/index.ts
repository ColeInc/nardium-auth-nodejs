import { Router } from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';
import { documentsController } from '../controllers/documents-controller';
import { stripeController } from '../controllers/payments/stripeController';
import express, { Request, Response } from 'express';
const router = Router();

// Log when routes are being registered
console.log('Initializing API routes...');

// Add logging middleware to track route selection
router.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.path}`);
  next();
});

// Apply JSON parsing to all routes except the webhook endpoint
router.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Public authentication routes
router.get('/auth/google/callback', (req: Request, res: Response) => {
  // Use type assertion to bypass TypeScript strictness
  return googleAuthController.authenticateUser(req as any, res);
});

// Protected routes
router.use((req, res, next) => {
  // Only protect the /auth/google/callback route
  if (req.path === '/auth/google/callback') {
    return validateApiRequest(req, res, next);
  }
  next();
});

// Protected auth routes
router.get('/auth/google/refresh-token', validateApiRequest, googleAuthController.refreshAccessToken);
router.get('/auth/logout', validateApiRequest, googleAuthController.logout);

// Document routes
router.post('/documents/access', validateApiRequest, documentsController.checkDocumentAccess);

// Payment routes
router.post('/create-stripe-session', validateApiRequest, stripeController.createStripeSession);

// Stripe webhook - listening for events from Stripe
router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeController.handleWebhook
);

// router.get('/user/status', validateApiRequest, userController.getStatus);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  };
  res.status(200).json(healthcheck);
});

console.log('API routes initialized successfully');

export default router; 