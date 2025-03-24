import { Router } from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';

const router = Router();

// Log when routes are being registered
console.log('Initializing API routes...');

// Add logging middleware to track route selection
router.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.path}`);
  next();
});

// Public authentication routes
router.get('/auth/google/callback', googleAuthController.authenticateUser);
// router.post('/auth/google/token', googleAuthController.exchangeToken);

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
// router.post('/auth/google/token', validateApiRequest, googleAuthController.exchangeToken);
router.get('/auth/logout', validateApiRequest, googleAuthController.logout);

// Add your other protected routes here
// For example:
// router.get('/documents', validateApiRequest, documentController.getDocuments);
// router.get('/user/status', validateApiRequest, userController.getStatus);

console.log('API routes initialized successfully');

export default router; 