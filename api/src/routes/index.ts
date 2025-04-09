import { Router } from 'express';
import authRoutes from './auth';
import documentsRoutes from './documents';
import paymentsRoutes from './payments';
import healthRoutes from './health';

const router = Router();

// Log when routes are being registered
console.log('Initializing API routes with modular structure...');

// Add logging middleware to track route selection
router.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.path}`);
  next();
});

// Mount modular routes
router.use('/auth', authRoutes);
router.use('/documents', documentsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/health', healthRoutes);

console.log('API routes initialized successfully');

export default router; 