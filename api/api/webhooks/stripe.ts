import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleStripeWebhook } from '../../src/services/stripe-service';
import { buffer } from 'micro';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Dedicated serverless function for handling Stripe webhooks
 * This function is optimized for:
 * - Raw body processing
 * - Minimal middleware overhead
 * - Fast response time
 */

// Disable body parsing for this endpoint
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function stripeWebhookHandler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    console.log('Stripe webhook function triggered');

    try {
        // Get the signature from headers
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
            console.log('Missing Stripe signature');
            res.status(400).json({ error: 'Missing Stripe signature' });
            return;
        }

        console.log(`Webhook received with signature: ${signature.substring(0, 10)}...`);

        // Get raw request body as buffer using micro
        const buf = await buffer(req);

        // Log request details for debugging (don't parse or transform the payload)
        console.log(`Received raw buffer of length: ${buf.length}`);

        // Process the webhook with raw buffer - IMPORTANT: don't transform the buffer in any way
        await handleStripeWebhook(signature, buf);

        // Return success immediately
        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        res.status(400).json({
            error: 'Webhook processing error',
            message: error.message
        });
    }
} 