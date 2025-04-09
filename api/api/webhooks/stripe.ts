import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleStripeWebhook } from '../../src/services/stripe-service';
import { Buffer } from 'buffer';
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

        // Get raw request body
        const rawBody = req.body;
        let buffer: Buffer;

        // Ensure we have the body as a Buffer
        if (Buffer.isBuffer(rawBody)) {
            buffer = rawBody;
            console.log('Request body is already a buffer');
        } else if (typeof rawBody === 'string') {
            buffer = Buffer.from(rawBody);
            console.log('Request body is a string, converted to buffer');
        } else if (rawBody && typeof rawBody === 'object') {
            buffer = Buffer.from(JSON.stringify(rawBody));
            console.log('Request body is an object, converted to buffer');
        } else {
            console.log('Invalid request body format');
            res.status(400).json({ error: 'Invalid request body format' });
            return;
        }

        // Try to parse the body to log the event type
        try {
            const parsedBody = JSON.parse(buffer.toString());
            console.log(`Processing webhook event type: ${parsedBody.type || 'unknown'}`);
        } catch (e) {
            console.log('Could not parse webhook body for logging');
        }

        // Process the webhook
        await handleStripeWebhook(signature, buffer);

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