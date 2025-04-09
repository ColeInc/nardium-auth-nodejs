import { Request, Response } from 'express';
import { supabaseAdmin } from '../../supabase-client';
import { getOrCreateStripeCustomer, createCheckoutSession, handleStripeWebhook } from '../../services/stripe-service';

export const stripeController = {
    // Create a Stripe Checkout session
    createStripeSession: async (req: Request, res: Response) => {
        console.log('Starting createStripeSession process');
        try {
            const { priceId, successUrl, cancelUrl } = req.body;
            console.log(`Received checkout request with priceId: ${priceId}`);
            const supabaseToken = req.headers.authorization?.split('Bearer ')[1];

            if (!supabaseToken) {
                console.log('Authentication failed: No token provided');
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!priceId || !successUrl || !cancelUrl) {
                console.log('Validation failed: Missing required fields', { priceId, successUrl, cancelUrl });
                return res.status(400).json({ error: 'Missing required fields: priceId, successUrl, cancelUrl' });
            }

            console.log('Verifying Supabase token and retrieving user info');
            // Verify the Supabase token and get user info
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken);

            if (error || !user) {
                console.log('Authentication failed: Invalid token', { error });
                return res.status(401).json({ error: 'Invalid authentication token' });
            }
            console.log(`User authenticated successfully: ${user.id}`);

            // Get or create a Stripe customer for this user
            console.log(`Getting or creating Stripe customer for user: ${user.id}`);
            const customerId = await getOrCreateStripeCustomer(user.id, user.email || '');
            console.log(`Stripe customer ID: ${customerId}`);

            // Create a Checkout session
            console.log('Creating Stripe checkout session');
            const sessionUrl = await createCheckoutSession(
                customerId,
                user.id,
                priceId,
                successUrl,
                cancelUrl
            );
            console.log(`Checkout session created successfully: ${sessionUrl}`);

            res.status(200).json({ url: sessionUrl });
        } catch (error: any) {
            console.error('Error creating Stripe session:', error);
            res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
        }
    },

    // Handle Stripe webhooks
    handleWebhook: async (req: Request, res: Response) => {
        console.log('Received Stripe webhook event');
        try {
            const signature = req.headers['stripe-signature'] as string;

            if (!signature) {
                console.log('Webhook validation failed: Missing Stripe signature');
                return res.status(400).json({ error: 'Missing Stripe signature' });
            }

            // For debugging
            console.log(`Webhook received with signature: ${signature.substring(0, 10)}...`);
            console.log(`Headers: ${JSON.stringify(req.headers)}`);

            // Log if the body is a buffer or already parsed
            if (Buffer.isBuffer(req.body)) {
                console.log('Request body is a Buffer (as expected)');
            } else {
                console.log(`Request body is already parsed: ${typeof req.body}`);
                console.log(`Body preview: ${JSON.stringify(req.body).substring(0, 100)}...`);
            }

            console.log('Validating webhook signature and processing event');

            // Get event type safely regardless of body format
            let eventType = 'unknown';
            if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
                eventType = req.body.type || 'unknown';
            } else if (Buffer.isBuffer(req.body)) {
                try {
                    const parsedBody = JSON.parse(req.body.toString());
                    eventType = parsedBody.type || 'unknown';
                } catch (e) {
                    console.error('Failed to parse webhook body', e);
                }
            }

            console.log(`Processing webhook event type: ${eventType}`);

            // Pass the raw buffer to the webhook handler
            const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
            await handleStripeWebhook(signature, rawBody);

            console.log(`Successfully processed webhook event: ${eventType}`);

            // Respond to Stripe with a success status
            return res.status(200).json({ received: true });
        } catch (error: any) {
            console.error('Webhook error:', error);
            return res.status(400).json({ error: 'Webhook error', details: error.message });
        }
    }
}; 