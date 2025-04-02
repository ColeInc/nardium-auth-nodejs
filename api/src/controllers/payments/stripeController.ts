import { Request, Response } from 'express';
import { supabaseAdmin } from '../../supabase-client';
import { getOrCreateStripeCustomer, createCheckoutSession, handleStripeWebhook } from '../../services/stripe-service';

export const stripeController = {
    // Create a Stripe Checkout session
    createStripeSession: async (req: Request, res: Response) => {
        try {
            const { priceId, successUrl, cancelUrl } = req.body;
            const supabaseToken = req.headers.authorization?.split('Bearer ')[1];

            if (!supabaseToken) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!priceId || !successUrl || !cancelUrl) {
                return res.status(400).json({ error: 'Missing required fields: priceId, successUrl, cancelUrl' });
            }

            // Verify the Supabase token and get user info
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken);

            if (error || !user) {
                return res.status(401).json({ error: 'Invalid authentication token' });
            }

            // Get or create a Stripe customer for this user
            const customerId = await getOrCreateStripeCustomer(user.id, user.email || '');

            // Create a Checkout session
            const sessionUrl = await createCheckoutSession(
                customerId,
                user.id,
                priceId,
                successUrl,
                cancelUrl
            );

            res.status(200).json({ url: sessionUrl });
        } catch (error: any) {
            console.error('Error creating Stripe session:', error);
            res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
        }
    },

    // Handle Stripe webhooks
    handleWebhook: async (req: Request, res: Response) => {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
            return res.status(400).json({ error: 'Missing Stripe signature' });
        }

        try {
            // Handle the webhook event
            await handleStripeWebhook(signature, req.body);

            // Respond to Stripe with a success status
            res.status(200).json({ received: true });
        } catch (error: any) {
            console.error('Webhook error:', error);
            res.status(400).json({ error: 'Webhook error', details: error.message });
        }
    }
}; 