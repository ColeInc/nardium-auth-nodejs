import { Router } from 'express';
import authRoutes from './auth';
import documentsRoutes from './documents';
import paymentsRoutes from './payments';
import healthRoutes from './health';
import express from 'express';

const router = Router();

// Log when routes are being registered
console.log('Initializing API routes with modular structure...');

// Add logging middleware to track route selection
router.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.path}`);
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
  express.json()(req, res, next);
});

// Mount modular routes
router.use('/auth', authRoutes);
router.use('/documents', documentsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/health', healthRoutes);

console.log('API routes initialized successfully');

export default router; 