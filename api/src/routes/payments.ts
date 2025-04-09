import { Router } from 'express';
import { stripeController } from '../controllers/payments/stripeController';
import { validateApiRequest } from '../middleware/security/apiAuth';
import express from 'express';

const router = Router();

// Add logging middleware for payment routes
router.use((req, res, next) => {
    console.log(`Payment route accessed: ${req.method} ${req.path}`);
    next();
});

// Apply JSON parsing middleware for regular payment routes
router.use(express.json());

// Payment routes - require authentication
router.post('/create-stripe-session', validateApiRequest, stripeController.createStripeSession);

export default router; 