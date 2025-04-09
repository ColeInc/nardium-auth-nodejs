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

// Apply JSON parsing middleware ONLY for non-webhook routes
router.use((req, res, next) => {
    // Skip JSON parsing for webhook routes
    if (req.path === '/webhook') {
        return next();
    }
    // Apply JSON parsing for all other routes
    express.json()(req, res, next);
});

// Payment routes - require authentication
router.post('/create-stripe-session', validateApiRequest, stripeController.createStripeSession);

// Stripe webhook endpoint - raw body is critical for signature verification
router.post('/webhook',
    express.raw({
        type: 'application/json',
        limit: '10mb'
    }),
    stripeController.handleWebhook
);

export default router; 