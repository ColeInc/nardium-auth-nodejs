import { Router } from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';

const router = Router();

// Log when routes are being registered
console.log('Initializing API routes...');

// Add logging middleware to track route selection
router.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.path}`);
  next();
});

router.get('/auth/google/callback', googleAuthController.authenticateUser);
// router.get('/auth/google/token', validateApiRequest, googleAuthController.exchangeToken);
// router.get('/auth/logout', validateApiRequest, googleAuthController.logout);

console.log('API routes initialized successfully');

export default router; 